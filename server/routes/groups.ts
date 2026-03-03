import { Router } from "express";
import { db } from "../db";
import { facebookGroups, salesReps } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";
import type { AuthScope } from "../lib/scope";
import { z } from "zod";

const router = Router();

const createGroupSchema = z.object({
  group_name: z.string().min(1),
  group_url: z.string().url(),
  rep_id: z.string().uuid().optional(),
  max_posts_per_day: z.number().int().min(1).max(20).optional(),
});

const updateGroupSchema = z.object({
  posting_enabled: z.boolean().optional(),
  max_posts_per_day: z.number().int().min(1).max(20).optional(),
});

router.get("/api/groups", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;

  const rows = await db
    .select({
      id: facebookGroups.id,
      dealerId: facebookGroups.dealerId,
      repId: facebookGroups.repId,
      groupName: facebookGroups.groupName,
      groupUrl: facebookGroups.groupUrl,
      postingEnabled: facebookGroups.postingEnabled,
      maxPostsPerDay: facebookGroups.maxPostsPerDay,
      dailyPostCount: facebookGroups.dailyPostCount,
      isActive: facebookGroups.isActive,
      repName: salesReps.name,
    })
    .from(facebookGroups)
    .leftJoin(salesReps, eq(facebookGroups.repId, salesReps.id))
    .where(
      and(
        eq(facebookGroups.dealerId, scope.dealer_id),
        eq(facebookGroups.isActive, true),
      ),
    );

  // Reps see only their own groups
  let filtered = rows;
  if (scope.role === "rep" && scope.rep_id) {
    filtered = rows.filter((r) => r.repId === scope.rep_id);
  }

  const result = filtered.map((r) => ({
    id: r.id,
    name: r.groupName,
    url: r.groupUrl,
    maxPostsPerDay: r.maxPostsPerDay ?? 3,
    repName: r.repName ?? "—",
    postsToday: r.dailyPostCount ?? 0,
    isActive: r.postingEnabled ?? true,
  }));

  res.json(result);
});

router.post(
  "/api/groups",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const data = createGroupSchema.parse(req.body);

      if (data.rep_id) {
        const [rep] = await db
          .select({ id: salesReps.id })
          .from(salesReps)
          .where(
            and(
              eq(salesReps.id, data.rep_id),
              eq(salesReps.dealerId, scope.dealer_id),
            ),
          );
        if (!rep) {
          return res.status(400).json({ error: "Invalid rep_id for this dealer" });
        }
      }

      const [group] = await db
        .insert(facebookGroups)
        .values({
          dealerId: scope.dealer_id,
          repId: data.rep_id ?? null,
          groupName: data.group_name,
          groupUrl: data.group_url,
          maxPostsPerDay: data.max_posts_per_day ?? 3,
        })
        .returning();

      res.json(group);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      next(err);
    }
  },
);

router.put(
  "/api/groups/:id",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const id = req.params.id as string;
      const data = updateGroupSchema.parse(req.body);

      const [existing] = await db
        .select({ id: facebookGroups.id })
        .from(facebookGroups)
        .where(
          and(
            eq(facebookGroups.id, id),
            eq(facebookGroups.dealerId, scope.dealer_id),
            eq(facebookGroups.isActive, true),
          ),
        );

      if (!existing) return res.status(404).json({ error: "Group not found" });

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (data.posting_enabled !== undefined) {
        updates.postingEnabled = data.posting_enabled;
      }
      if (data.max_posts_per_day !== undefined) {
        updates.maxPostsPerDay = data.max_posts_per_day;
      }

      const [updated] = await db
        .update(facebookGroups)
        .set(updates)
        .where(eq(facebookGroups.id, id))
        .returning();

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      next(err);
    }
  },
);

router.delete(
  "/api/groups/:id",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res) => {
    const scope = req.user as AuthScope;
    const id = req.params.id as string;

    const [existing] = await db
      .select({ id: facebookGroups.id })
      .from(facebookGroups)
      .where(
        and(
          eq(facebookGroups.id, id),
          eq(facebookGroups.dealerId, scope.dealer_id),
        ),
      );

    if (!existing) return res.status(404).json({ error: "Group not found" });

    await db
      .update(facebookGroups)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(facebookGroups.id, id));

    res.json({ success: true });
  },
);

export default router;
