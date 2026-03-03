import { Router, type Request, type Response, type NextFunction } from "express";
import { requireVpsApiKey } from "../middleware/auth";
import { db } from "../db";
import {
  salesReps, vehicles, postingLog, selectorConfigs, dealers,
  systemAlerts, accountActivityLog,
} from "@shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { generateListing } from "../lib/ai";
import { z } from "zod";

const router = Router();

const RAMP_SCHEDULE: Record<number, number> = {};
for (let d = 1; d <= 3; d++) RAMP_SCHEDULE[d] = 0;
for (let d = 4; d <= 5; d++) RAMP_SCHEDULE[d] = 2;
for (let d = 6; d <= 8; d++) RAMP_SCHEDULE[d] = 4;
for (let d = 9; d <= 11; d++) RAMP_SCHEDULE[d] = 6;
for (let d = 12; d <= 14; d++) RAMP_SCHEDULE[d] = 8;

function getRampLimit(rampDay: number, fullLimit: number): number {
  if (rampDay >= 15) return fullLimit;
  return RAMP_SCHEDULE[rampDay] ?? 0;
}

// VPS-facing route: get next vehicle for a rep to post
router.get("/api/vps/vehicles/next", requireVpsApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repId = req.query.rep_id as string;
    if (!repId) return res.status(400).json({ error: "rep_id required" });

    const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, repId));
    if (!rep || !rep.isActive) return res.json({ vehicle: null });

    const [dealer] = await db.select().from(dealers).where(eq(dealers.id, rep.dealerId!));
    if (!dealer) return res.json({ vehicle: null });

    const effectiveLimit = getRampLimit(rep.rampDay ?? 0, rep.dailyPostLimit ?? 10);
    if ((rep.postsToday ?? 0) >= effectiveLimit) return res.json({ vehicle: null });

    if (rep.lastPostAt) {
      const minGap = 5 * 60 * 1000;
      if (Date.now() - new Date(rep.lastPostAt).getTime() < minGap) {
        return res.json({ vehicle: null });
      }
    }

    const tz = dealer.timezone || "America/New_York";
    const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    const hour = nowInTz.getHours();
    if (hour < 8 || hour >= 21) return res.json({ vehicle: null });

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentPosts = await db
      .select({ vehicleId: postingLog.vehicleId })
      .from(postingLog)
      .where(and(eq(postingLog.repId, repId), eq(postingLog.status, "success"), gte(postingLog.postedAt, threeDaysAgo)));
    const recentlyPostedVehicleIds = new Set(recentPosts.map((p) => p.vehicleId));

    const dealerVehicles = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.dealerId, rep.dealerId!), eq(vehicles.status, "active")));

    let eligible = dealerVehicles.filter((v) => !recentlyPostedVehicleIds.has(v.id));
    if (rep.assignmentMode === "selected" && rep.assignedVehicleIds?.length) {
      eligible = eligible.filter((v) => rep.assignedVehicleIds!.includes(v.id));
    }
    if (eligible.length === 0) return res.json({ vehicle: null });

    const vehicle = eligible[Math.floor(Math.random() * eligible.length)];

    const recentDescs = await db
      .select({ generatedDescription: postingLog.generatedDescription })
      .from(postingLog)
      .where(and(eq(postingLog.vehicleId, vehicle.id), eq(postingLog.status, "success")))
      .orderBy(desc(postingLog.postedAt))
      .limit(5);
    const previousDescriptions = recentDescs.map((d) => d.generatedDescription).filter(Boolean) as string[];

    const listing = await generateListing({
      year: vehicle.year, make: vehicle.make, model: vehicle.model, trim: vehicle.trim,
      mileage: vehicle.mileage, price: vehicle.price, condition: vehicle.condition,
      bodyType: vehicle.bodyType, exteriorColor: vehicle.exteriorColor,
      interiorColor: vehicle.interiorColor, transmission: vehicle.transmission,
      fuelType: vehicle.fuelType, drivetrain: vehicle.drivetrain, engine: vehicle.engine,
      features: vehicle.features, descriptionRaw: vehicle.descriptionRaw,
      previousDescriptions, dealerPhone: dealer.phone, dealerCity: dealer.city, dealerState: dealer.state,
    });

    const photos = vehicle.photosProcessed?.length ? vehicle.photosProcessed : vehicle.photosOriginal || [];

    // Return in the shape the worker expects
    res.json({
      vehicle: {
        id: vehicle.id,
        dealer_id: vehicle.dealerId,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        price: vehicle.price ? Number(vehicle.price) : null,
        mileage: vehicle.mileage,
        description: listing.description,
        photo_urls: photos,
        status: vehicle.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// VPS-facing route: log a posting result
const vpsPostLogSchema = z.object({
  rep_id: z.string().uuid(),
  dealer_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  status: z.enum(["success", "failed"]),
  marketplace_listing_id: z.string().optional(),
  screenshot_url: z.string().optional(),
  error_message: z.string().optional(),
  duration_ms: z.number().optional(),
});

router.post("/api/vps/posts/log", requireVpsApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = vpsPostLogSchema.parse(req.body);

    await db.insert(postingLog).values({
      repId: data.rep_id,
      dealerId: data.dealer_id,
      vehicleId: data.vehicle_id,
      targetType: "marketplace",
      status: data.status,
      fbListingId: data.marketplace_listing_id || null,
      errorMessage: data.error_message || null,
      errorScreenshotUrl: data.screenshot_url || null,
      durationSeconds: data.duration_ms ? Math.round(data.duration_ms / 1000) : null,
      postedAt: new Date(),
    });

    if (data.status === "success") {
      await db.update(salesReps).set({
        postsToday: sql`${salesReps.postsToday} + 1`,
        totalPosts: sql`${salesReps.totalPosts} + 1`,
        lastPostAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(salesReps.id, data.rep_id));
    }

    if (data.status === "failed" && data.error_message) {
      const [rep] = await db.select({ dealerId: salesReps.dealerId, name: salesReps.name }).from(salesReps).where(eq(salesReps.id, data.rep_id));
      if (rep) {
        let alertType = "posting_failure";
        if (data.error_message.includes("checkpoint")) alertType = "facebook_checkpoint";
        if (data.error_message.includes("login")) alertType = "login_failure";
        await db.insert(systemAlerts).values({
          dealerId: rep.dealerId,
          repId: data.rep_id,
          alertType,
          severity: alertType === "facebook_checkpoint" ? "critical" : "warning",
          title: `Posting failed for ${rep.name}`,
          details: data.error_message,
        });
      }
    }

    await db.insert(accountActivityLog).values({
      repId: data.rep_id,
      activityType: "post_attempt",
      details: { vehicle_id: data.vehicle_id, status: data.status, target_type: "marketplace" },
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// VPS-facing route: get posting config (selectors, timing)
router.get("/api/vps/config", requireVpsApiKey, async (_req: Request, res: Response) => {
  const selectors = await db
    .select()
    .from(selectorConfigs)
    .where(eq(selectorConfigs.isActive, true))
    .orderBy(desc(selectorConfigs.createdAt))
    .limit(1);
  const config = selectors[0];

  res.json({
    selectors: config?.selectors || {},
    delays: { keystroke_min: 40, keystroke_max: 100, field_pause_min: 200, field_pause_max: 800 },
    warm_up: { standard_min_minutes: 2, standard_max_minutes: 5, extended_threshold_hours: 48 },
    schedule: { window_start_hour: 8, window_end_hour: 21 },
  });
});

// VPS-facing route: receive health report
router.post("/api/vps/health", requireVpsApiKey, async (req: Request, res: Response) => {
  const { adspower, redis, database, postingQueueDepth, photoQueueDepth } = req.body;

  if (!adspower || !redis || !database) {
    await db.insert(systemAlerts).values({
      alertType: "infrastructure_degraded",
      severity: "critical",
      title: "VPS infrastructure issue detected",
      details: JSON.stringify({
        adspower, redis, database,
        postingQueueDepth, photoQueueDepth,
        reportedAt: new Date().toISOString(),
      }),
    });
  }

  res.json({ received: true });
});

export default router;
