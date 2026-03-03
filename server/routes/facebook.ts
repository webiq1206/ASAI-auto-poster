import { Router } from "express";
import { db } from "../db";
import { salesReps } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { encrypt } from "../lib/encryption";
import { z } from "zod";
import type { AuthScope } from "../lib/scope";

const router = Router();

const connectSchema = z.object({
  rep_id: z.string().uuid().optional(),
  facebook_email: z.string().email(),
  facebook_password: z.string().min(1),
});

router.post("/api/facebook/connect", requireAuth, async (req, res, next) => {
  try {
    const scope = req.user as AuthScope;
    const data = connectSchema.parse(req.body);

    let repId = data.rep_id || scope.rep_id;
    if (!repId) {
      return res.status(400).json({ error: "No rep_id available" });
    }

    // Verify the rep belongs to the user's dealer (unless superadmin)
    if (scope.role !== "superadmin") {
      const [rep] = await db
        .select({ id: salesReps.id, dealerId: salesReps.dealerId })
        .from(salesReps)
        .where(eq(salesReps.id, repId));
      if (!rep || rep.dealerId !== scope.dealer_id) {
        return res.status(403).json({ error: "Not authorized" });
      }
    }

    const encryptedPassword = encrypt(data.facebook_password);

    await db
      .update(salesReps)
      .set({
        facebookEmail: data.facebook_email,
        facebookPasswordEncrypted: encryptedPassword,
        updatedAt: new Date(),
      })
      .where(eq(salesReps.id, repId));

    // Trigger AdsPower profile creation via VPS worker (fire-and-forget)
    if (process.env.VPS_API_KEY && process.env.VPS_HEALTH_ENDPOINT) {
      fetch(`${process.env.VPS_HEALTH_ENDPOINT}/api/vps/onboard`, {
        method: "POST",
        headers: { "X-VPS-API-Key": process.env.VPS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ rep_id: repId }),
      }).catch(() => {});
    }

    res.json({ success: true, status: "verifying" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

router.get("/api/facebook/status", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;
  const repId = (req.query.rep_id as string) || scope.rep_id;

  if (!repId) {
    return res.json({ status: "disconnected" });
  }

  const [rep] = await db
    .select({
      status: salesReps.status,
      facebookEmail: salesReps.facebookEmail,
    })
    .from(salesReps)
    .where(eq(salesReps.id, repId));

  if (!rep) {
    return res.json({ status: "disconnected" });
  }

  let connectionStatus = "disconnected";
  if (rep.facebookEmail) {
    if (rep.status === "active" || rep.status === "warming") {
      connectionStatus = "connected";
    } else if (rep.status === "flagged") {
      connectionStatus = "checkpoint";
    } else if (rep.status === "pending") {
      connectionStatus = "verifying";
    } else {
      connectionStatus = rep.status || "disconnected";
    }
  }

  res.json({
    status: connectionStatus,
    email: rep.facebookEmail,
  });
});

export default router;
