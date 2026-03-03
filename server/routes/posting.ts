import { Router } from "express";
import { db } from "../db";
import {
  salesReps, vehicles, postingLog, selectorConfigs, dealers,
  systemAlerts, accountActivityLog,
} from "@shared/schema";
import { eq, and, desc, gte, ne, sql } from "drizzle-orm";
import { requireVpsApiKey } from "../middleware/auth";
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

router.get("/api/posting/next", requireVpsApiKey, async (req, res, next) => {
  try {
    const repId = req.query.rep_id as string;
    if (!repId) return res.status(400).json({ error: "rep_id required" });

    const [rep] = await db
      .select()
      .from(salesReps)
      .where(eq(salesReps.id, repId));

    if (!rep || !rep.isActive) {
      return res.json(null);
    }

    const [dealer] = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, rep.dealerId!));

    if (!dealer) return res.json(null);

    // Anti-detection: daily limit
    const effectiveLimit = getRampLimit(rep.rampDay ?? 0, rep.dailyPostLimit ?? 10);
    if ((rep.postsToday ?? 0) >= effectiveLimit) {
      return res.json(null);
    }

    // Anti-detection: 5+ min gap
    if (rep.lastPostAt) {
      const minGap = 5 * 60 * 1000;
      if (Date.now() - new Date(rep.lastPostAt).getTime() < minGap) {
        return res.json(null);
      }
    }

    // Anti-detection: posting window (8AM-9PM dealer timezone)
    const tz = dealer.timezone || "America/New_York";
    const nowInTz = new Date(
      new Date().toLocaleString("en-US", { timeZone: tz }),
    );
    const hour = nowInTz.getHours();
    if (hour < 8 || hour >= 21) {
      return res.json(null);
    }

    // Anti-detection: no repost within 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentPosts = await db
      .select({ vehicleId: postingLog.vehicleId })
      .from(postingLog)
      .where(
        and(
          eq(postingLog.repId, repId),
          eq(postingLog.status, "success"),
          gte(postingLog.postedAt, threeDaysAgo),
        ),
      );
    const recentlyPostedVehicleIds = new Set(recentPosts.map((p) => p.vehicleId));

    // Find eligible vehicles
    const dealerVehicles = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.dealerId, rep.dealerId!),
          eq(vehicles.status, "active"),
        ),
      );

    // Filter: not recently posted
    let eligible = dealerVehicles.filter(
      (v) => !recentlyPostedVehicleIds.has(v.id),
    );

    // Filter: rep assignment
    if (rep.assignmentMode === "selected" && rep.assignedVehicleIds?.length) {
      eligible = eligible.filter((v) =>
        rep.assignedVehicleIds!.includes(v.id),
      );
    }

    if (eligible.length === 0) {
      return res.json(null);
    }

    // Pick a random vehicle from eligible
    const vehicle = eligible[Math.floor(Math.random() * eligible.length)];

    // Get recent descriptions for unique content
    const recentDescs = await db
      .select({ generatedDescription: postingLog.generatedDescription })
      .from(postingLog)
      .where(
        and(
          eq(postingLog.vehicleId, vehicle.id),
          eq(postingLog.status, "success"),
        ),
      )
      .orderBy(desc(postingLog.postedAt))
      .limit(5);

    const previousDescriptions = recentDescs
      .map((d) => d.generatedDescription)
      .filter(Boolean) as string[];

    // Generate AI listing
    const listing = await generateListing({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      mileage: vehicle.mileage,
      price: vehicle.price,
      condition: vehicle.condition,
      bodyType: vehicle.bodyType,
      exteriorColor: vehicle.exteriorColor,
      interiorColor: vehicle.interiorColor,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      drivetrain: vehicle.drivetrain,
      engine: vehicle.engine,
      features: vehicle.features,
      descriptionRaw: vehicle.descriptionRaw,
      previousDescriptions,
      dealerPhone: dealer.phone,
      dealerCity: dealer.city,
      dealerState: dealer.state,
    });

    // Determine photos to use (processed > original)
    const photos =
      vehicle.photosProcessed?.length
        ? vehicle.photosProcessed
        : vehicle.photosOriginal || [];

    res.json({
      vehicle_id: vehicle.id,
      vehicle: {
        id: vehicle.id,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        vin: vehicle.vin,
        mileage: vehicle.mileage,
        price: vehicle.price,
        condition: vehicle.condition,
        bodyType: vehicle.bodyType,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
      },
      content: listing,
      photos,
      account: {
        name: dealer.name,
        phone: dealer.phone,
        city: dealer.city,
        state: dealer.state,
        timezone: tz,
      },
    });
  } catch (err) {
    next(err);
  }
});

const postLogSchema = z.object({
  rep_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  schedule_id: z.string().uuid().optional(),
  target_type: z.enum(["marketplace", "group"]),
  target_group_id: z.string().uuid().optional(),
  status: z.enum(["success", "failed", "skipped"]),
  fb_listing_id: z.string().optional(),
  fb_listing_url: z.string().optional(),
  generated_title: z.string().optional(),
  generated_description: z.string().optional(),
  photos_uploaded: z.number().optional(),
  error_message: z.string().optional(),
  error_screenshot_url: z.string().optional(),
  duration_seconds: z.number().optional(),
});

router.post("/api/posting/log", requireVpsApiKey, async (req, res, next) => {
  try {
    const data = postLogSchema.parse(req.body);

    await db.insert(postingLog).values({
      repId: data.rep_id,
      vehicleId: data.vehicle_id,
      scheduleId: data.schedule_id || null,
      targetType: data.target_type,
      targetGroupId: data.target_group_id || null,
      status: data.status,
      fbListingId: data.fb_listing_id || null,
      fbListingUrl: data.fb_listing_url || null,
      generatedTitle: data.generated_title || null,
      generatedDescription: data.generated_description || null,
      photosUploaded: data.photos_uploaded ?? 0,
      errorMessage: data.error_message || null,
      errorScreenshotUrl: data.error_screenshot_url || null,
      durationSeconds: data.duration_seconds ?? 0,
    });

    // Update rep stats
    if (data.status === "success") {
      await db
        .update(salesReps)
        .set({
          postsToday: sql`${salesReps.postsToday} + 1`,
          totalPosts: sql`${salesReps.totalPosts} + 1`,
          lastPostAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(salesReps.id, data.rep_id));
    }

    // Create alert on failure
    if (data.status === "failed" && data.error_message) {
      const [rep] = await db
        .select({ dealerId: salesReps.dealerId, name: salesReps.name })
        .from(salesReps)
        .where(eq(salesReps.id, data.rep_id));

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

    // Log to activity
    await db.insert(accountActivityLog).values({
      repId: data.rep_id,
      activityType: "post_attempt",
      details: {
        vehicle_id: data.vehicle_id,
        status: data.status,
        target_type: data.target_type,
      },
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

router.get("/api/posting/config", requireVpsApiKey, async (req, res) => {
  const selectors = await db
    .select()
    .from(selectorConfigs)
    .where(eq(selectorConfigs.isActive, true))
    .orderBy(desc(selectorConfigs.createdAt))
    .limit(1);

  const config = selectors[0];

  res.json({
    selectors: config?.selectors || {
      category: '[aria-label="Category"]',
      year: '[aria-label="Year"]',
      make: '[aria-label="Make"]',
      model: '[aria-label="Model"]',
      mileage: '[aria-label="Mileage"]',
      price: '[aria-label="Price"]',
      vin: '[aria-label="VIN"]',
      body_type: '[aria-label="Body style"]',
      fuel_type: '[aria-label="Fuel type"]',
      transmission: '[aria-label="Transmission"]',
      description: '[aria-label="Description"]',
      photos_upload: 'input[type="file"][accept*="image"]',
      publish_button: '[aria-label="Publish"]',
    },
    timing: {
      keystroke_min_ms: 40,
      keystroke_max_ms: 100,
      field_pause_min_ms: 200,
      field_pause_max_ms: 800,
      pre_submit_pause_ms: 2000,
      photo_upload_pause_ms: 1500,
    },
  });
});

export default router;
