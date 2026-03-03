import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { dealers, stripeEvents, systemAlerts, subscriptionAddons } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" as any });
}

const PRICE_TO_FLAG: Record<string, string> = {};

function loadPriceMappings() {
  if (process.env.STRIPE_CORE_PRICE_ID) PRICE_TO_FLAG[process.env.STRIPE_CORE_PRICE_ID] = "featureCoreActive";
  if (process.env.STRIPE_BACKGROUNDS_PRICE_ID) PRICE_TO_FLAG[process.env.STRIPE_BACKGROUNDS_PRICE_ID] = "featureCustomBackgrounds";
  if (process.env.STRIPE_VISUAL_MERCH_PRICE_ID) PRICE_TO_FLAG[process.env.STRIPE_VISUAL_MERCH_PRICE_ID] = "featureVisualMerchandising";
  if (process.env.STRIPE_DASHBOARD_PRICE_ID) PRICE_TO_FLAG[process.env.STRIPE_DASHBOARD_PRICE_ID] = "featureSalesDashboard";
}

router.post("/api/webhooks/stripe", async (req, res) => {
  loadPriceMappings();
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  // Idempotency check
  const existing = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.stripeEventId, event.id));

  if (existing.length > 0) {
    return res.json({ received: true, status: "already_processed" });
  }

  try {
    await handleStripeEvent(event);

    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event.data.object as any,
      processed: true,
      processedAt: new Date(),
    });
  } catch (err) {
    console.error("Error processing Stripe event:", err);
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event.data.object as any,
      processed: false,
    });
  }

  res.json({ received: true });
});

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.customer && session.metadata?.dealer_id) {
        await db
          .update(dealers)
          .set({
            stripeCustomerId: session.customer as string,
            updatedAt: new Date(),
          })
          .where(eq(dealers.id, session.metadata.dealer_id));
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const [dealer] = await db
        .select()
        .from(dealers)
        .where(eq(dealers.stripeCustomerId, subscription.customer as string));

      if (!dealer) break;

      const updates: Record<string, any> = {
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
        updatedAt: new Date(),
      };

      for (const item of subscription.items.data) {
        const priceId = item.price.id;
        const flagName = PRICE_TO_FLAG[priceId];
        if (flagName) {
          updates[flagName] = subscription.status === "active" || subscription.status === "trialing";
        }
      }

      // Mutual exclusion: if enabling visual merch, disable custom backgrounds and vice versa
      if (updates.featureVisualMerchandising === true) {
        updates.featureCustomBackgrounds = false;
      } else if (updates.featureCustomBackgrounds === true) {
        updates.featureVisualMerchandising = false;
      }

      await db.update(dealers).set(updates).where(eq(dealers.id, dealer.id));
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const [dealer] = await db
        .select()
        .from(dealers)
        .where(eq(dealers.stripeCustomerId, subscription.customer as string));

      if (!dealer) break;

      await db
        .update(dealers)
        .set({
          featureCoreActive: false,
          featureCustomBackgrounds: false,
          featureVisualMerchandising: false,
          featureSalesDashboard: false,
          stripeSubscriptionStatus: "canceled",
          updatedAt: new Date(),
        })
        .where(eq(dealers.id, dealer.id));
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const [dealer] = await db
        .select()
        .from(dealers)
        .where(eq(dealers.stripeCustomerId, invoice.customer as string));

      if (dealer) {
        await db
          .update(dealers)
          .set({ stripeSubscriptionStatus: "active", updatedAt: new Date() })
          .where(eq(dealers.id, dealer.id));
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const [dealer] = await db
        .select()
        .from(dealers)
        .where(eq(dealers.stripeCustomerId, invoice.customer as string));

      if (dealer) {
        await db
          .update(dealers)
          .set({ stripeSubscriptionStatus: "past_due", updatedAt: new Date() })
          .where(eq(dealers.id, dealer.id));

        await db.insert(systemAlerts).values({
          dealerId: dealer.id,
          alertType: "payment_failed",
          severity: "critical",
          title: `Payment failed for ${dealer.name}`,
          details: `Invoice ${invoice.id} payment failed`,
        });
      }
      break;
    }
  }
}

export default router;
