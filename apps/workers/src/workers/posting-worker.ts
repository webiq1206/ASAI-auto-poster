import { Worker, type Job } from "bullmq";
import { chromium, type Browser } from "playwright";
import IORedis from "ioredis";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { getDb } from "../lib/db.js";
import * as adspower from "../lib/adspower.js";
import { getNextVehicle, logPost, getConfig } from "../lib/dashboard-api.js";
import { postVehicle } from "../jobs/post-vehicle.js";
import { standardWarmUp, extendedWarmUp } from "../jobs/warm-up.js";

interface PostingJobData {
  rep_id: number;
  dealer_id: number;
}

async function processPostingJob(job: Job<PostingJobData>): Promise<void> {
  const { rep_id, dealer_id } = job.data;
  const startTime = Date.now();

  logger.info("Processing posting job", { jobId: job.id, repId: rep_id, dealerId: dealer_id });

  // Fetch vehicle
  const vehicle = await getNextVehicle(rep_id);
  if (!vehicle) {
    logger.info("No vehicle available, skipping", { repId: rep_id });
    return;
  }

  logger.info("Vehicle assigned", { vehicleId: vehicle.id, vin: vehicle.vin });

  // Get rep's AdsPower profile
  const db = getDb();
  const repResult = await db.query(
    "SELECT adspower_profile_id, last_post_at, status FROM sales_reps WHERE id = $1",
    [rep_id],
  );
  const rep = repResult.rows[0];

  if (!rep?.adspower_profile_id) {
    throw new Error(`Rep ${rep_id} has no AdsPower profile`);
  }

  const profileId = rep.adspower_profile_id;
  let browser: Browser | undefined;

  try {
    // Check if warm-up needed
    const postingConfig = await getConfig();
    const hoursSinceLastPost = rep.last_post_at
      ? (Date.now() - new Date(rep.last_post_at).getTime()) / (1000 * 60 * 60)
      : Infinity;

    // Start AdsPower browser
    await job.updateProgress(10);
    logger.info("Starting AdsPower browser", { profileId });
    const wsUrl = await adspower.startBrowser(profileId);

    // Connect Playwright
    await job.updateProgress(20);
    browser = await chromium.connectOverCDP(wsUrl);
    const context = browser.contexts()[0];
    const page = context?.pages()[0] ?? (await context.newPage());
    page.setDefaultTimeout(30_000);

    // Warm-up if needed
    if (hoursSinceLastPost > postingConfig.warm_up.extended_threshold_hours) {
      await job.updateProgress(25);
      logger.info("Extended warm-up triggered", { hoursSinceLastPost });
      await extendedWarmUp(page);
    } else if (rep.status === "warming" || hoursSinceLastPost > 12) {
      await job.updateProgress(25);
      logger.info("Standard warm-up triggered", { hoursSinceLastPost });
      await standardWarmUp(page);
    }

    // Post the vehicle
    await job.updateProgress(50);
    const { screenshotBuffer, success } = await postVehicle(page, vehicle, postingConfig);
    await job.updateProgress(90);

    // Log success
    const durationMs = Date.now() - startTime;
    await logPost({
      rep_id,
      dealer_id,
      vehicle_id: vehicle.id,
      status: "success",
      duration_ms: durationMs,
    });

    // Update rep stats
    await db.query(
      `UPDATE sales_reps SET
        posts_today = posts_today + 1,
        total_posts = total_posts + 1,
        last_post_at = NOW()
      WHERE id = $1`,
      [rep_id],
    );

    // Mark vehicle as recently posted in the posting log (vehicle stays 'active' for re-listing)
    await db.query("UPDATE vehicles SET updated_at = NOW() WHERE id = $1", [vehicle.id]);

    await job.updateProgress(100);
    logger.info("Posting job completed successfully", {
      jobId: job.id,
      repId: rep_id,
      vehicleId: vehicle.id,
      durationMs,
    });
  } catch (err: any) {
    logger.error("Posting job failed", {
      jobId: job.id,
      repId: rep_id,
      vehicleId: vehicle.id,
      error: err.message,
    });

    await logPost({
      rep_id,
      dealer_id,
      vehicle_id: vehicle.id,
      status: "failed",
      error_message: err.message,
      duration_ms: Date.now() - startTime,
    });

    throw err;
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    try { await adspower.stopBrowser(profileId); } catch {}
  }
}

export function createPostingWorker(): Worker<PostingJobData> {
  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker<PostingJobData>("posting", processPostingJob, {
    connection,
    concurrency: 1,
    limiter: { max: 1, duration: 60_000 },
    lockDuration: 300_000,
  });

  worker.on("completed", (job) => {
    logger.info("Posting job completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error("Posting job failed", { jobId: job?.id, error: err.message });
  });

  worker.on("error", (err) => {
    logger.error("Posting worker error", { error: err.message });
  });

  logger.info("Posting worker initialized");
  return worker;
}
