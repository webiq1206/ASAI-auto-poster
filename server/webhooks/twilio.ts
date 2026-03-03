import { Router } from "express";
import { db } from "../db";
import { leads, messages, dealers, salesReps, vehicles } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { generateChatbotResponse } from "../lib/ai";
import { scoreLead } from "../lib/lead-scoring";
import { fireGhlWebhook } from "../lib/ghl";

const router = Router();

router.post("/api/webhooks/twilio", async (req, res) => {
  try {
    const { From, To, Body, MessageSid } = req.body;

    if (!From || !Body) {
      return res.status(400).send("<Response></Response>");
    }

    // Normalize phone number
    const phone = From.replace(/\D/g, "");

    // Find lead by phone
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.phone, phone));

    if (lead) {
      // Save inbound message
      await db.insert(messages).values({
        leadId: lead.id,
        direction: "inbound",
        channel: "sms",
        content: Body,
        sender: "customer",
        metadata: { twilio_message_sid: MessageSid },
      });

      // Get dealer and rep for context
      let dealer = null;
      let rep = null;
      if (lead.dealerId) {
        const [d] = await db.select().from(dealers).where(eq(dealers.id, lead.dealerId));
        dealer = d;
      }
      if (lead.repId) {
        const [r] = await db.select().from(salesReps).where(eq(salesReps.id, lead.repId));
        rep = r;
      }

      // Get conversation history
      const recentMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.leadId, lead.id))
        .orderBy(desc(messages.sentAt))
        .limit(10);

      const conversationHistory = recentMessages
        .reverse()
        .map((m) => ({
          role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        }));

      // Get vehicle info for context
      let vehicleInfo = "";
      if (lead.vehicleId) {
        const [v] = await db.select().from(vehicles).where(eq(vehicles.id, lead.vehicleId));
        if (v) {
          vehicleInfo = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""} - $${v.price || "N/A"} - ${v.mileage?.toLocaleString() || "N/A"} miles`;
        }
      }

      // Generate AI response
      const aiResponse = await generateChatbotResponse({
        vehicleInfo: vehicleInfo || "General inquiry",
        conversationHistory,
        dealerPhone: dealer?.phone,
      });

      // Save outbound message
      await db.insert(messages).values({
        leadId: lead.id,
        direction: "outbound",
        channel: "sms",
        content: aiResponse,
        sender: "ai",
        metadata: { channel: "twilio" },
      });

      // Score lead
      const scoringResult = scoreLead({
        messageContent: Body,
        existingScore: lead.qualificationScore ?? 0,
        existingData: (lead.qualificationData as Record<string, number>) || {},
      });

      const prevQualification = lead.qualificationScore ?? 0;
      await db
        .update(leads)
        .set({
          qualificationScore: scoringResult.score,
          qualificationData: scoringResult.data,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, lead.id));

      // Fire GHL webhook if qualified
      if (scoringResult.qualification === "qualified" && rep && lead.dealerId) {
        await fireGhlWebhook({
          event: prevQualification < 60 ? "lead_qualified" : "message_received",
          dealer_id: lead.dealerId,
          rep_id: rep.id,
          rep_name: rep.name,
          lead_id: lead.id,
          data: {
            score: scoringResult.score,
            qualification: scoringResult.qualification,
            message: Body,
            channel: "sms",
          },
        });
      }

      // Respond with TwiML including the AI message
      const escapedMessage = aiResponse
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      return res.type("text/xml").send(`<Response><Message>${escapedMessage}</Message></Response>`);
    }

    // No lead found - respond with empty TwiML
    res.type("text/xml").send("<Response></Response>");
  } catch (err) {
    console.error("Twilio webhook error:", err);
    res.type("text/xml").send("<Response></Response>");
  }
});

export default router;
