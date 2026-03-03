import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";
import { invitations, users, salesReps, dealers, subscriptionAddons } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";
import { hashPassword } from "../auth";
import { encrypt } from "../lib/encryption";
import { sendInviteEmail } from "../lib/email";
import { z } from "zod";
import type { AuthScope } from "../lib/scope";

const router = Router();

const createInviteSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(200),
  password: z.string().min(8),
  facebook_email: z.string().email().optional(),
  facebook_password: z.string().optional(),
});

router.post(
  "/api/invitations",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const data = createInviteSchema.parse(req.body);

      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, data.email.toLowerCase()));
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "A user with this email already exists" });
      }

      const existingInvite = await db
        .select({ id: invitations.id })
        .from(invitations)
        .where(
          and(
            eq(invitations.email, data.email.toLowerCase()),
            eq(invitations.dealerId, scope.dealer_id),
            eq(invitations.status, "pending"),
          ),
        );
      if (existingInvite.length > 0) {
        return res.status(400).json({ error: "An invitation is already pending for this email" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const [invitation] = await db
        .insert(invitations)
        .values({
          dealerId: scope.dealer_id,
          invitedBy: scope.user_id,
          email: data.email.toLowerCase(),
          name: data.name,
          token,
          role: "rep",
          status: "pending",
          expiresAt,
        })
        .returning();

      const [dealer] = await db
        .select({ name: dealers.name })
        .from(dealers)
        .where(eq(dealers.id, scope.dealer_id));

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:5000";
      const inviteUrl = `${baseUrl}/invite/${token}`;

      try {
        await sendInviteEmail({
          to: data.email,
          inviteeName: data.name,
          dealershipName: dealer?.name || "Your Dealership",
          inviteUrl,
        });
      } catch (emailErr) {
        console.error("Failed to send invite email:", emailErr);
      }

      res.json({
        invitation_id: invitation.id,
        token: invitation.token,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      next(err);
    }
  },
);

router.get("/api/invitations/validate/:token", async (req, res) => {
  const { token } = req.params;

  const [invitation] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      name: invitations.name,
      dealerId: invitations.dealerId,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.token, token));

  if (!invitation) {
    return res.status(404).json({ error: "Invitation not found" });
  }

  if (invitation.status !== "pending") {
    return res.status(400).json({ error: "Invitation has already been used" });
  }

  if (invitation.expiresAt < new Date()) {
    return res.status(400).json({ error: "Invitation has expired" });
  }

  const [dealer] = await db
    .select({ name: dealers.name })
    .from(dealers)
    .where(eq(dealers.id, invitation.dealerId!));

  res.json({
    valid: true,
    email: invitation.email,
    name: invitation.name,
    dealership_name: dealer?.name,
  });
});

router.post("/api/invitations/accept", async (req, res, next) => {
  try {
    const data = acceptInviteSchema.parse(req.body);

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, data.token),
          eq(invitations.status, "pending"),
        ),
      );

    if (!invitation) {
      return res.status(404).json({ error: "Invalid or expired invitation" });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invitation has expired" });
    }

    const passwordHash = await hashPassword(data.password);

    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          dealerId: invitation.dealerId,
          email: invitation.email.toLowerCase(),
          name: data.name,
          passwordHash,
          role: "rep",
        })
        .returning();

      const repValues: Record<string, unknown> = {
        dealerId: invitation.dealerId,
        userId: user.id,
        name: data.name,
        email: invitation.email.toLowerCase(),
        status: "pending",
      };

      if (data.facebook_email) {
        repValues.facebookEmail = data.facebook_email;
      }
      if (data.facebook_password) {
        repValues.facebookPasswordEncrypted = encrypt(data.facebook_password);
      }

      const [rep] = await tx
        .insert(salesReps)
        .values(repValues as any)
        .returning();

      await tx
        .update(invitations)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(invitations.id, invitation.id));

      return { user, rep };
    });

    // Trigger AdsPower profile creation if FB creds were provided
    if (data.facebook_email && process.env.VPS_API_KEY && process.env.VPS_HEALTH_ENDPOINT) {
      fetch(`${process.env.VPS_HEALTH_ENDPOINT}/api/vps/onboard`, {
        method: "POST",
        headers: { "X-VPS-API-Key": process.env.VPS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ rep_id: result.rep.id }),
      }).catch(() => {});
    }

    // Increment Stripe Visual Merch quantity if feature is active
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const [dealer] = await db
          .select({ featureVisualMerchandising: dealers.featureVisualMerchandising, stripeSubscriptionId: dealers.stripeSubscriptionId })
          .from(dealers)
          .where(eq(dealers.id, invitation.dealerId!));
        if (dealer?.featureVisualMerchandising && dealer.stripeSubscriptionId) {
          const Stripe = (await import("stripe")).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
          const sub = await stripe.subscriptions.retrieve(dealer.stripeSubscriptionId);
          const vmItem = sub.items.data.find((i: any) => i.price?.id === process.env.STRIPE_VISUAL_MERCH_PRICE_ID);
          if (vmItem) {
            await stripe.subscriptionItems.update(vmItem.id, { quantity: (vmItem.quantity || 1) + 1 });
          }
        }
      } catch (stripeErr) {
        console.error("Failed to update Stripe VM quantity:", stripeErr);
      }
    }

    req.login(
      {
        user_id: result.user.id,
        dealer_id: invitation.dealerId!,
        role: "rep" as const,
        rep_id: result.rep.id,
        account_type: "dealership" as const,
      },
      (err) => {
        if (err) return next(err);
        return res.json({ success: true, redirect: "/dashboard" });
      },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

router.get(
  "/api/invitations",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res) => {
    const scope = req.user as AuthScope;
    const result = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        name: invitations.name,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
      })
      .from(invitations)
      .where(eq(invitations.dealerId, scope.dealer_id));

    res.json(result);
  },
);

export default router;
