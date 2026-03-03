import { Router } from "express";
import { db } from "../db";
import { leads, messages, salesReps, vehicles, dealers } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateChatbotResponse } from "../lib/ai";
import { scoreLead } from "../lib/lead-scoring";
import { fireGhlWebhook } from "../lib/ghl";

const router = Router();

// Webhook verification
router.get("/api/webhooks/facebook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.FB_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Incoming messages
router.post("/api/webhooks/facebook", async (req, res) => {
  res.sendStatus(200); // Respond immediately

  try {
    const body = req.body;
    if (body.object !== "page") return;

    for (const entry of body.entry || []) {
      const pageId = entry.id;

      for (const event of entry.messaging || []) {
        if (!event.message?.text) continue;

        const senderPsid = event.sender.id;
        const messageText = event.message.text;

        // Find which rep's FB page this belongs to
        // Map page ID to rep via metadata stored in notes or a future column
        // For now, try to find by dealer-level FB page mapping
        const allReps = await db
          .select()
          .from(salesReps)
          .where(eq(salesReps.isActive, true));

        // Match by notes containing pageId, or fall back to first active rep
        const rep = allReps.find((r) => r.notes?.includes(pageId)) || allReps[0];

        if (!rep) continue;

        const [dealer] = await db
          .select()
          .from(dealers)
          .where(eq(dealers.id, rep.dealerId!));

        // Find or create lead
        let [lead] = await db
          .select()
          .from(leads)
          .where(
            and(eq(leads.fbUserId, senderPsid), eq(leads.repId, rep.id)),
          );

        if (!lead) {
          const [newLead] = await db
            .insert(leads)
            .values({
              dealerId: rep.dealerId!,
              repId: rep.id,
              fbUserId: senderPsid,
              name: `FB User ${senderPsid.slice(-4)}`,
              source: "messenger",
              status: "new",
            })
            .returning();
          lead = newLead;

          // Fire GHL webhook for new lead
          await fireGhlWebhook({
            event: "new_lead",
            dealer_id: rep.dealerId!,
            rep_id: rep.id,
            rep_name: rep.name,
            lead_id: newLead.id,
            data: { source: "messenger", fb_user_id: senderPsid },
          });
        }

        // Save inbound message
        await db.insert(messages).values({
          leadId: lead.id,
          direction: "inbound",
          channel: "messenger",
          content: messageText,
          sender: "customer",
        });

        // Fire GHL webhook for message
        await fireGhlWebhook({
          event: "message_received",
          dealer_id: rep.dealerId!,
          rep_id: rep.id,
          rep_name: rep.name,
          lead_id: lead.id,
          data: { message: messageText, channel: "messenger" },
        });

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
          channel: "messenger",
          content: aiResponse,
          sender: "ai",
        });

        // Send response via Facebook Send API
        try {
          await fetch(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: senderPsid },
                message: { text: aiResponse },
              }),
            },
          );
        } catch (sendErr) {
          console.error("Failed to send FB message:", sendErr);
        }

        // Score lead
        const scoringResult = scoreLead({
          messageContent: messageText,
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

        // If qualification changed, fire GHL webhook
        if (scoringResult.score >= 60 && prevQualification < 60) {
          await fireGhlWebhook({
            event: "lead_qualified",
            dealer_id: rep.dealerId!,
            rep_id: rep.id,
            rep_name: rep.name,
            lead_id: lead.id,
            data: { score: scoringResult.score, qualification: scoringResult.qualification },
          });
        }
      }
    }
  } catch (err) {
    console.error("Facebook webhook error:", err);
  }
});

export default router;
