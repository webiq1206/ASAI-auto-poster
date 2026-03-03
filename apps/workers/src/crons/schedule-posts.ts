import cron, { type ScheduledTask } from "node-cron";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { getDb } from "../lib/db.js";

function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

function shouldPostNow(
  postsToday: number,
  dailyTarget: number,
  windowStartHour: number,
  windowEndHour: number,
): boolean {
  if (postsToday >= dailyTarget) return false;

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  if (currentHour < windowStartHour || currentHour > windowEndHour) return false;

  const windowLength = windowEndHour - windowStartHour;
  const windowProgress = (currentHour - windowStartHour) / windowLength;
  const expectedPosts = dailyTarget * windowProgress;

  // Use Gaussian distribution centered on even spacing with some randomness
  const meanInterval = windowLength / dailyTarget;
  const nextPostTime = windowStartHour + (postsToday + 0.5) * meanInterval;
  const jitter = gaussianRandom(0, meanInterval * 0.3);
  const targetTime = nextPostTime + jitter;

  return currentHour >= targetTime || postsToday < expectedPosts - 1;
}

export function startSchedulePostsCron(): ScheduledTask {
  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  const postingQueue = new Queue("posting", { connection });

  const task = cron.schedule("*/5 * * * *", async () => {
    try {
      logger.info("Running post scheduling check");

      const db = getDb();
      const result = await db.query(`
        SELECT sr.id as rep_id, sr.dealer_id, sr.posts_today, sr.daily_post_limit,
               sr.status, sr.ramp_day, sr.last_post_at
        FROM sales_reps sr
        JOIN dealers d ON d.id = sr.dealer_id
        WHERE sr.status IN ('active', 'warming')
          AND (d.stripe_subscription_status = 'active' OR d.trial_ends_at > NOW())
          AND sr.adspower_profile_id IS NOT NULL
      `);

      const windowStart = 8;
      const windowEnd = 21;
      let queued = 0;

      for (const rep of result.rows) {
        // For warming reps, scale down the daily target based on ramp day
        let effectiveTarget = rep.daily_post_limit || 10;
        if (rep.status === "warming" && rep.ramp_day) {
          const rampFactor = Math.min(rep.ramp_day / 14, 1);
          effectiveTarget = Math.max(1, Math.floor(effectiveTarget * rampFactor));
        }

        if (shouldPostNow(rep.posts_today, effectiveTarget, windowStart, windowEnd)) {
          await postingQueue.add(
            `post-${rep.rep_id}-${Date.now()}`,
            { rep_id: rep.rep_id, dealer_id: rep.dealer_id },
            {
              attempts: 2,
              backoff: { type: "exponential", delay: 60_000 },
              removeOnComplete: { age: 86_400 },
              removeOnFail: { age: 604_800 },
            },
          );
          queued++;
          logger.debug("Queued posting job", { repId: rep.rep_id, postsToday: rep.posts_today, target: effectiveTarget });
        }
      }

      logger.info("Post scheduling complete", { repsChecked: result.rows.length, jobsQueued: queued });
    } catch (err: any) {
      logger.error("Schedule posts cron failed", { error: err.message });
    }
  });

  logger.info("Schedule posts cron started (every 5 min)");
  return task;
}
