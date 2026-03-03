import { Router } from "express";
import { db } from "../db";
import { dealers, users, salesReps } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { hashPassword } from "../auth";
import { z } from "zod";
import type { AuthScope } from "../lib/scope";

const router = Router();

router.get("/api/settings", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, scope.user_id));

  const [dealer] = await db.select().from(dealers).where(eq(dealers.id, scope.dealer_id));

  let rep = null;
  if (scope.rep_id) {
    const [r] = await db
      .select({
        id: salesReps.id,
        name: salesReps.name,
        email: salesReps.email,
        facebookEmail: salesReps.facebookEmail,
        status: salesReps.status,
      })
      .from(salesReps)
      .where(eq(salesReps.id, scope.rep_id));
    rep = r;
  }

  res.json({
    user,
    dealer: {
      id: dealer?.id,
      name: dealer?.name,
      phone: dealer?.phone,
      email: dealer?.email,
      address: dealer?.address,
      city: dealer?.city,
      state: dealer?.state,
      zip: dealer?.zip,
      timezone: dealer?.timezone,
      accountType: dealer?.accountType,
      dmsFeedUrl: dealer?.dmsFeedUrl,
      dmsProvider: dealer?.dmsProvider,
      ghlWebhookUrl: dealer?.ghlWebhookUrl,
      ghlPipelineId: dealer?.ghlPipelineId,
      ghlCalendarId: dealer?.ghlCalendarId,
    },
    rep,
  });
});

const updateSettingsSchema = z.object({
  dealer: z.object({
    name: z.string().min(1).max(200).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email().optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(50).optional(),
    zip: z.string().max(20).optional(),
    timezone: z.string().max(50).optional(),
    dmsFeedUrl: z.string().url().or(z.literal("")).optional(),
    dmsProvider: z.string().max(50).optional(),
    ghlWebhookUrl: z.string().url().or(z.literal("")).optional(),
    ghlPipelineId: z.string().max(100).optional(),
    ghlCalendarId: z.string().max(100).optional(),
  }).optional(),
  profile: z.object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
  }).optional(),
});

router.put("/api/settings", requireAuth, async (req, res, next) => {
  try {
    const scope = req.user as AuthScope;
    const updates = updateSettingsSchema.parse(req.body);

    if (updates.dealer && (scope.role === "owner" || scope.role === "admin")) {
      const dealerUpdates: Record<string, any> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(updates.dealer)) {
        if (value !== undefined) {
          dealerUpdates[key] = value;
        }
      }
      await db.update(dealers).set(dealerUpdates).where(eq(dealers.id, scope.dealer_id));
    }

    if (updates.profile) {
      const userUpdates: Record<string, any> = { updatedAt: new Date() };
      if (updates.profile.name) userUpdates.name = updates.profile.name;
      if (updates.profile.email) userUpdates.email = updates.profile.email;
      if (updates.profile.password) {
        userUpdates.passwordHash = await hashPassword(updates.profile.password);
      }
      await db.update(users).set(userUpdates).where(eq(users.id, scope.user_id));
    }

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

export default router;
