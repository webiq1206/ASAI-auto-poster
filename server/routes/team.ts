import { Router } from "express";
import { db } from "../db";
import { salesReps, users, leads, dealers } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";
import type { AuthScope } from "../lib/scope";

const router = Router();

router.get("/api/team", requireAuth, requireOwnerOrAdmin, async (req, res) => {
  const scope = req.user as AuthScope;

  const reps = await db
    .select({
      id: salesReps.id,
      name: salesReps.name,
      email: salesReps.email,
      status: salesReps.status,
      healthScore: salesReps.healthScore,
      postsToday: salesReps.postsToday,
      totalPosts: salesReps.totalPosts,
      totalLeads: salesReps.totalLeads,
      facebookEmail: salesReps.facebookEmail,
      isActive: salesReps.isActive,
      rampDay: salesReps.rampDay,
      lastPostAt: salesReps.lastPostAt,
      createdAt: salesReps.createdAt,
    })
    .from(salesReps)
    .where(eq(salesReps.dealerId, scope.dealer_id));

  res.json(reps);
});

router.put(
  "/api/team/:repId/pause",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const repId = req.params.repId as string;

      const [rep] = await db
        .select()
        .from(salesReps)
        .where(and(eq(salesReps.id, repId), eq(salesReps.dealerId, scope.dealer_id)));

      if (!rep) return res.status(404).json({ error: "Rep not found" });

      await db
        .update(salesReps)
        .set({ status: "paused", isActive: false, updatedAt: new Date() })
        .where(eq(salesReps.id, repId));

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/api/team/:repId/resume",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const repId = req.params.repId as string;

      const [rep] = await db
        .select()
        .from(salesReps)
        .where(and(eq(salesReps.id, repId), eq(salesReps.dealerId, scope.dealer_id)));

      if (!rep) return res.status(404).json({ error: "Rep not found" });

      await db
        .update(salesReps)
        .set({ status: "active", isActive: true, updatedAt: new Date() })
        .where(eq(salesReps.id, repId));

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/api/team/:repId",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const repId = req.params.repId as string;

      const [rep] = await db
        .select()
        .from(salesReps)
        .where(and(eq(salesReps.id, repId), eq(salesReps.dealerId, scope.dealer_id)));

      if (!rep) return res.status(404).json({ error: "Rep not found" });

      await db.transaction(async (tx) => {
        // Pause the rep
        await tx
          .update(salesReps)
          .set({ status: "paused", isActive: false, updatedAt: new Date() })
          .where(eq(salesReps.id, repId));

        // Reassign leads to unassigned pool
        await tx
          .update(leads)
          .set({ repId: null as any, updatedAt: new Date() })
          .where(eq(leads.repId, repId));

        // Disable user login
        if (rep.userId) {
          await tx
            .update(users)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(users.id, rep.userId));
        }
      });

      // Close AdsPower profile via VPS API (30-day retention, fire-and-forget)
      if (rep.adspowerProfileId && process.env.VPS_API_KEY && process.env.VPS_HEALTH_ENDPOINT) {
        fetch(`${process.env.VPS_HEALTH_ENDPOINT}/api/vps/profile/deactivate`, {
          method: "POST",
          headers: { "X-VPS-API-Key": process.env.VPS_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ profile_id: rep.adspowerProfileId, retention_days: 30 }),
        }).catch(() => {});
      }

      // Decrement Stripe Visual Merch quantity if active
      if (process.env.STRIPE_SECRET_KEY) {
        try {
          const [dealer] = await db
            .select({ featureVisualMerchandising: dealers.featureVisualMerchandising, stripeSubscriptionId: dealers.stripeSubscriptionId })
            .from(dealers)
            .where(eq(dealers.id, scope.dealer_id));
          if (dealer?.featureVisualMerchandising && dealer.stripeSubscriptionId) {
            const Stripe = (await import("stripe")).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const sub = await stripe.subscriptions.retrieve(dealer.stripeSubscriptionId);
            const vmItem = sub.items.data.find((i: any) => i.price?.id === process.env.STRIPE_VISUAL_MERCH_PRICE_ID);
            if (vmItem && (vmItem.quantity || 1) > 1) {
              await stripe.subscriptionItems.update(vmItem.id, { quantity: (vmItem.quantity || 1) - 1 });
            }
          }
        } catch (stripeErr) {
          console.error("Failed to update Stripe VM quantity:", stripeErr);
        }
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
