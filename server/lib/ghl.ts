import { db } from "../db";
import { dealers, ghlWebhookLog } from "@shared/schema";
import { eq } from "drizzle-orm";

type GhlEvent =
  | "new_lead"
  | "lead_qualified"
  | "appointment_requested"
  | "lead_escalated"
  | "message_received"
  | "lead_updated";

interface GhlPayload {
  event: GhlEvent;
  dealer_id: string;
  rep_id: string;
  rep_name: string;
  lead_id: string;
  data: Record<string, unknown>;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [60_000, 300_000, 900_000]; // 1min, 5min, 15min

export async function fireGhlWebhook(payload: GhlPayload): Promise<void> {
  const [dealer] = await db
    .select({
      featureSalesDashboard: dealers.featureSalesDashboard,
      ghlWebhookUrl: dealers.ghlWebhookUrl,
    })
    .from(dealers)
    .where(eq(dealers.id, payload.dealer_id));

  if (!dealer?.featureSalesDashboard || !dealer.ghlWebhookUrl) {
    return;
  }

  const webhookUrl = dealer.ghlWebhookUrl;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await db.insert(ghlWebhookLog).values({
        dealerId: payload.dealer_id,
        eventType: payload.event,
        payload: payload as any,
        responseStatus: response.status,
        success: response.ok,
      });

      if (response.ok) return;

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    } catch (err: any) {
      await db.insert(ghlWebhookLog).values({
        dealerId: payload.dealer_id,
        eventType: payload.event,
        payload: payload as any,
        responseStatus: 0,
        success: false,
      });

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }
  }
}
