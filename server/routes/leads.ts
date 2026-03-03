import { Router } from "express";
import { db } from "../db";
import { leads, messages, salesReps } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import type { AuthScope } from "../lib/scope";

const router = Router();

router.get("/api/leads", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;

  let result;
  if (scope.role === "superadmin") {
    result = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(200);
  } else if (scope.role === "rep" && scope.rep_id) {
    result = await db
      .select()
      .from(leads)
      .where(eq(leads.repId, scope.rep_id))
      .orderBy(desc(leads.createdAt));
  } else {
    result = await db
      .select()
      .from(leads)
      .where(eq(leads.dealerId, scope.dealer_id))
      .orderBy(desc(leads.createdAt));
  }

  res.json(result);
});

router.get("/api/leads/:id", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;
  const id = req.params.id as string;

  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  // Scope check
  if (scope.role !== "superadmin") {
    if (lead.dealerId !== scope.dealer_id) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (scope.role === "rep" && lead.repId !== scope.rep_id) {
      return res.status(403).json({ error: "Not authorized" });
    }
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.leadId, id))
    .orderBy(messages.sentAt);

  res.json({ lead, messages: msgs });
});

const updateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "appointment", "sold", "lost"]).optional(),
  qualification_score: z.number().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
});

router.put("/api/leads/:id", requireAuth, async (req, res, next) => {
  try {
    const scope = req.user as AuthScope;
    const id = req.params.id as string;
    const data = updateLeadSchema.parse(req.body);

    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    if (scope.role !== "superadmin" && lead.dealerId !== scope.dealer_id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const setValues: Record<string, any> = { updatedAt: new Date() };
    if (data.status !== undefined) setValues.status = data.status;
    if (data.qualification_score !== undefined) setValues.qualificationScore = data.qualification_score;
    if (data.notes !== undefined) setValues.notes = data.notes;

    const [updated] = await db.update(leads).set(setValues).where(eq(leads.id, id)).returning();
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

export default router;
