import { Router } from "express";
import { db } from "../db";
import { postingSchedules, salesReps } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import type { AuthScope } from "../lib/scope";

const router = Router();

router.get("/api/schedules", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;

  if (scope.role === "rep" && scope.rep_id) {
    const schedules = await db
      .select()
      .from(postingSchedules)
      .where(eq(postingSchedules.repId, scope.rep_id));
    return res.json(schedules);
  }

  const schedules = await db
    .select()
    .from(postingSchedules)
    .where(eq(postingSchedules.dealerId, scope.dealer_id));
  res.json(schedules);
});

router.get("/api/schedules/:repId", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;
  const repId = req.params.repId as string;

  if (scope.role === "rep" && scope.rep_id !== repId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const [schedule] = await db
    .select()
    .from(postingSchedules)
    .where(and(eq(postingSchedules.repId, repId), eq(postingSchedules.dealerId, scope.dealer_id)));

  if (!schedule) {
    return res.json({
      repId,
      dealerId: scope.dealer_id,
      postsPerDay: 8,
      postingWindowStart: "08:00",
      postingWindowEnd: "21:00",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      isActive: true,
      skipRecentlyPostedDays: 3,
      enableGroupCrosspost: true,
    });
  }
  res.json(schedule);
});

const updateScheduleSchema = z.object({
  posts_per_day: z.number().int().min(1).max(50).optional(),
  posting_window_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  posting_window_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  is_active: z.boolean().optional(),
  skip_recently_posted_days: z.number().int().min(0).max(30).optional(),
  enable_group_crosspost: z.boolean().optional(),
});

router.put("/api/schedules", requireAuth, async (req, res, next) => {
  try {
    const scope = req.user as AuthScope;
    const data = updateScheduleSchema.parse(req.body);
    const repId = scope.rep_id;

    if (!repId) {
      return res.status(400).json({ error: "No rep_id in session" });
    }

    const [existing] = await db
      .select()
      .from(postingSchedules)
      .where(and(eq(postingSchedules.repId, repId), eq(postingSchedules.dealerId, scope.dealer_id)));

    if (existing) {
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (data.posts_per_day !== undefined) updates.postsPerDay = data.posts_per_day;
      if (data.posting_window_start !== undefined) updates.postingWindowStart = data.posting_window_start;
      if (data.posting_window_end !== undefined) updates.postingWindowEnd = data.posting_window_end;
      if (data.days_of_week !== undefined) updates.daysOfWeek = data.days_of_week;
      if (data.is_active !== undefined) updates.isActive = data.is_active;
      if (data.skip_recently_posted_days !== undefined) updates.skipRecentlyPostedDays = data.skip_recently_posted_days;
      if (data.enable_group_crosspost !== undefined) updates.enableGroupCrosspost = data.enable_group_crosspost;

      const [updated] = await db
        .update(postingSchedules)
        .set(updates)
        .where(eq(postingSchedules.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(postingSchedules)
      .values({
        dealerId: scope.dealer_id,
        repId,
        name: "Default Schedule",
        postsPerDay: data.posts_per_day ?? 8,
        postingWindowStart: data.posting_window_start ?? "08:00",
        postingWindowEnd: data.posting_window_end ?? "21:00",
        daysOfWeek: data.days_of_week ?? [0, 1, 2, 3, 4, 5, 6],
        isActive: data.is_active ?? true,
        skipRecentlyPostedDays: data.skip_recently_posted_days ?? 3,
        enableGroupCrosspost: data.enable_group_crosspost ?? true,
      })
      .returning();
    res.json(created);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

export default router;
