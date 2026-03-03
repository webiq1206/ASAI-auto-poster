import { Router } from "express";
import passport from "passport";
import { db } from "../db";
import { dealers, users, salesReps } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword, slugify } from "../auth";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = Router();

const signupSchema = z.object({
  account_type: z.enum(["dealership", "individual"]),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

router.post("/api/auth/signup", async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()));
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const passwordHash = await hashPassword(data.password);
    const slug = slugify(data.name);

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const result = await db.transaction(async (tx) => {
      const [dealer] = await tx
        .insert(dealers)
        .values({
          accountType: data.account_type,
          name: data.name,
          slug,
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
          trialEndsAt,
          featureCoreActive: true,
        })
        .returning();

      const [user] = await tx
        .insert(users)
        .values({
          dealerId: dealer.id,
          email: data.email.toLowerCase(),
          name: data.name,
          passwordHash,
          role: "owner",
        })
        .returning();

      let repId: string | undefined;
      if (data.account_type === "individual") {
        const [rep] = await tx
          .insert(salesReps)
          .values({
            dealerId: dealer.id,
            userId: user.id,
            name: data.name,
            email: data.email.toLowerCase(),
            status: "pending",
          })
          .returning();
        repId = rep.id;
      }

      return { dealer, user, repId };
    });

    req.login(
      {
        user_id: result.user.id,
        dealer_id: result.dealer.id,
        role: "owner" as const,
        rep_id: result.repId,
        account_type: data.account_type,
      },
      (err) => {
        if (err) return next(err);
        return res.json({
          success: true,
          redirect:
            data.account_type === "individual"
              ? "/settings"
              : "/dashboard",
        });
      },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

router.post("/api/auth/login", (req, res, next) => {
  passport.authenticate(
    "local",
    (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) {
        return res
          .status(401)
          .json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json({ success: true, user });
      });
    },
  )(req, res, next);
});

router.post("/api/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

router.get("/api/auth/me", requireAuth, async (req, res) => {
  const scope = req.user!;
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, scope.user_id));

  const [dealer] = await db
    .select({
      id: dealers.id,
      name: dealers.name,
      accountType: dealers.accountType,
      featureCoreActive: dealers.featureCoreActive,
      featureCustomBackgrounds: dealers.featureCustomBackgrounds,
      featureVisualMerchandising: dealers.featureVisualMerchandising,
      featureSalesDashboard: dealers.featureSalesDashboard,
      trialEndsAt: dealers.trialEndsAt,
    })
    .from(dealers)
    .where(eq(dealers.id, scope.dealer_id));

  if (!user || !dealer) {
    return res.status(404).json({ error: "User not found" });
  }

  const now = new Date();
  const trialActive = dealer.trialEndsAt ? dealer.trialEndsAt > now : false;
  const coreActive = dealer.featureCoreActive || trialActive;

  res.json({
    ...scope,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    dealer: {
      id: dealer.id,
      name: dealer.name,
      accountType: dealer.accountType,
    },
    features: {
      core: coreActive,
      customBackgrounds: dealer.featureCustomBackgrounds,
      visualMerchandising: dealer.featureVisualMerchandising,
      salesDashboard: dealer.featureSalesDashboard,
      trialActive,
    },
  });
});

export default router;
