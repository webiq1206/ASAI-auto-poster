import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { dealers, salesReps } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";
import type { AuthScope } from "../lib/scope";

const router = Router();

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" as any });
}

router.post(
  "/api/billing/checkout",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const { price_id } = req.body;

      if (!price_id) {
        return res.status(400).json({ error: "price_id required" });
      }

      const [dealer] = await db
        .select()
        .from(dealers)
        .where(eq(dealers.id, scope.dealer_id));

      if (!dealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }

      // Mutual exclusion enforcement
      const bgPriceId = process.env.STRIPE_BACKGROUNDS_PRICE_ID;
      const vmPriceId = process.env.STRIPE_VISUAL_MERCH_PRICE_ID;
      if (price_id === bgPriceId && dealer.featureVisualMerchandising) {
        return res.status(400).json({
          error: "Cannot add Custom Backgrounds while Visual Merchandising is active",
        });
      }
      if (price_id === vmPriceId && dealer.featureCustomBackgrounds) {
        return res.status(400).json({
          error: "Cannot add Visual Merchandising while Custom Backgrounds is active",
        });
      }

      const stripe = getStripe();
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:5000";

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        { price: price_id, quantity: 1 },
      ];

      // For Visual Merch, set quantity = active rep count
      if (price_id === vmPriceId) {
        const reps = await db
          .select({ id: salesReps.id })
          .from(salesReps)
          .where(
            and(eq(salesReps.dealerId, scope.dealer_id), eq(salesReps.isActive, true)),
          );
        lineItems[0].quantity = Math.max(1, reps.length);
      }

      // Handle setup fee for Sales Dashboard
      const setupPriceId = process.env.STRIPE_DASHBOARD_SETUP_PRICE_ID;
      if (
        price_id === process.env.STRIPE_DASHBOARD_PRICE_ID &&
        setupPriceId &&
        !dealer.featureSalesDashboardSetupPaid
      ) {
        lineItems.push({ price: setupPriceId, quantity: 1 });
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        line_items: lineItems,
        success_url: `${baseUrl}/billing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/billing`,
        metadata: { dealer_id: scope.dealer_id },
      };

      if (dealer.stripeCustomerId) {
        sessionParams.customer = dealer.stripeCustomerId;
      } else {
        sessionParams.customer_email = dealer.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/api/billing/portal",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;

      const [dealer] = await db
        .select({ stripeCustomerId: dealers.stripeCustomerId })
        .from(dealers)
        .where(eq(dealers.id, scope.dealer_id));

      if (!dealer?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const stripe = getStripe();
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:5000";

      const session = await stripe.billingPortal.sessions.create({
        customer: dealer.stripeCustomerId,
        return_url: `${baseUrl}/billing`,
      });

      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/api/billing",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res) => {
    const scope = req.user as AuthScope;

    const [dealer] = await db.select().from(dealers).where(eq(dealers.id, scope.dealer_id));
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });

    const reps = await db
      .select({ id: salesReps.id, name: salesReps.name, isActive: salesReps.isActive })
      .from(salesReps)
      .where(eq(salesReps.dealerId, scope.dealer_id));

    const activeRepCount = reps.filter((r) => r.isActive).length;

    const now = new Date();
    const trialActive = dealer.trialEndsAt ? dealer.trialEndsAt > now : false;

    res.json({
      plan: dealer.subscriptionPlan,
      stripeStatus: dealer.stripeSubscriptionStatus,
      hasStripeCustomer: !!dealer.stripeCustomerId,
      trialActive,
      trialEndsAt: dealer.trialEndsAt,
      features: {
        core: dealer.featureCoreActive || trialActive,
        customBackgrounds: dealer.featureCustomBackgrounds,
        visualMerchandising: dealer.featureVisualMerchandising,
        salesDashboard: dealer.featureSalesDashboard,
        salesDashboardSetupPaid: dealer.featureSalesDashboardSetupPaid,
      },
      activeRepCount,
      reps: reps.map((r) => ({ id: r.id, name: r.name, active: r.isActive })),
    });
  },
);

export default router;
