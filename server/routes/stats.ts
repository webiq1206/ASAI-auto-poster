import { Router } from "express";
import { db } from "../db";
import { salesReps, postingLog, leads, vehicles, accountActivityLog, messages } from "@shared/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthScope } from "../lib/scope";

const router = Router();

router.get("/api/stats/posts-today", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (scope.role === "rep" && scope.rep_id) {
    const [rep] = await db
      .select({ postsToday: salesReps.postsToday })
      .from(salesReps)
      .where(eq(salesReps.id, scope.rep_id));
    return res.json(rep?.postsToday || 0);
  }

  const reps = await db
    .select({ postsToday: salesReps.postsToday })
    .from(salesReps)
    .where(eq(salesReps.dealerId, scope.dealer_id));

  const total = reps.reduce((sum, r) => sum + (r.postsToday || 0), 0);
  res.json(total);
});

router.get("/api/posting-log", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;

  let result;
  if (scope.role === "rep" && scope.rep_id) {
    result = await db
      .select()
      .from(postingLog)
      .where(eq(postingLog.repId, scope.rep_id))
      .orderBy(sql`${postingLog.postedAt} DESC`)
      .limit(200);
  } else if (scope.role === "superadmin") {
    result = await db
      .select()
      .from(postingLog)
      .orderBy(sql`${postingLog.postedAt} DESC`)
      .limit(200);
  } else {
    const dealerReps = await db
      .select({ id: salesReps.id })
      .from(salesReps)
      .where(eq(salesReps.dealerId, scope.dealer_id));
    const repIds = dealerReps.map((r) => r.id);

    if (repIds.length === 0) {
      return res.json([]);
    }

    result = await db
      .select()
      .from(postingLog)
      .where(sql`${postingLog.repId} IN (${sql.join(repIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(sql`${postingLog.postedAt} DESC`)
      .limit(200);
  }

  res.json(result);
});

router.get("/api/stats/activity", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;

  const repFilter = scope.role === "rep" && scope.rep_id
    ? eq(accountActivityLog.repId, scope.rep_id)
    : scope.role === "superadmin"
      ? undefined
      : sql`${accountActivityLog.repId} IN (SELECT id FROM sales_reps WHERE dealer_id = ${scope.dealer_id})`;

  const activities = await db
    .select()
    .from(accountActivityLog)
    .where(repFilter)
    .orderBy(desc(accountActivityLog.createdAt))
    .limit(20);

  res.json(activities);
});

router.get("/api/stats/posting-chart", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;
  const days = 7;
  const results: Array<{ date: string; success: number; failed: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dateFilter = and(
      sql`${postingLog.postedAt} >= ${dayStart}`,
      sql`${postingLog.postedAt} <= ${dayEnd}`,
    );

    const scopeFilter = scope.role === "superadmin"
      ? dateFilter
      : scope.role === "rep" && scope.rep_id
        ? and(dateFilter, eq(postingLog.repId, scope.rep_id))
        : and(dateFilter, eq(postingLog.dealerId, scope.dealer_id));

    const [successCount] = await db
      .select({ count: count() })
      .from(postingLog)
      .where(and(scopeFilter, eq(postingLog.status, "success")));
    const [failedCount] = await db
      .select({ count: count() })
      .from(postingLog)
      .where(and(scopeFilter, eq(postingLog.status, "failed")));

    results.push({
      date: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
      success: Number(successCount?.count ?? 0),
      failed: Number(failedCount?.count ?? 0),
    });
  }

  res.json(results);
});

router.get("/api/stats/response-time", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const scopeFilter = scope.role === "rep" && scope.rep_id
    ? and(eq(leads.repId, scope.rep_id), sql`${leads.createdAt} >= ${since}`)
    : scope.role === "superadmin"
      ? sql`${leads.createdAt} >= ${since}`
      : and(eq(leads.dealerId, scope.dealer_id), sql`${leads.createdAt} >= ${since}`);

  const recentLeads = await db
    .select({ id: leads.id, createdAt: leads.createdAt })
    .from(leads)
    .where(scopeFilter)
    .orderBy(desc(leads.createdAt))
    .limit(50);

  if (recentLeads.length === 0) {
    return res.json({ avgMinutes: null });
  }

  let totalMs = 0;
  let counted = 0;
  for (const lead of recentLeads) {
    const [firstReply] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(and(eq(messages.leadId, lead.id), eq(messages.direction, "outbound")))
      .orderBy(messages.createdAt)
      .limit(1);
    if (firstReply && lead.createdAt && firstReply.createdAt) {
      totalMs += new Date(firstReply.createdAt).getTime() - new Date(lead.createdAt).getTime();
      counted++;
    }
  }

  const avgMinutes = counted > 0 ? Math.round(totalMs / counted / 60000) : null;
  res.json({ avgMinutes });
});

export default router;
