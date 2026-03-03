import cron, { type ScheduledTask } from "node-cron";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { getDb } from "../lib/db.js";

export function startListingRenewalCron(): ScheduledTask {
  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  const postingQueue = new Queue("posting", { connection });

  const task = cron.schedule("0 * * * *", async () => {
    try {
      logger.info("Running listing renewal check");
      const db = getDb();

      const result = await db.query(`
        SELECT pl.id as post_id, pl.vehicle_id, pl.rep_id, pl.dealer_id,
               v.vin, v.year, v.make, v.model,
               pl.renewal_count
        FROM posting_log pl
        JOIN vehicles v ON v.id = pl.vehicle_id
        JOIN sales_reps sr ON sr.id = pl.rep_id
        WHERE pl.posted_at < NOW() - INTERVAL '6 days'
          AND pl.status = 'success'
          AND (pl.renewal_count IS NULL OR pl.renewal_count < 3)
          AND v.status = 'active'
          AND sr.status IN ('active', 'warming')
          AND sr.adspower_profile_id IS NOT NULL
        ORDER BY pl.posted_at ASC
        LIMIT 50
      `);

      let queued = 0;

      for (const listing of result.rows) {
        await db.query(
          "UPDATE posting_log SET renewal_count = COALESCE(renewal_count, 0) + 1, last_renewed_at = NOW(), is_renewal = true WHERE id = $1",
          [listing.post_id],
        );

        await postingQueue.add(
          `renewal-${listing.vehicle_id}-${Date.now()}`,
          { rep_id: listing.rep_id, dealer_id: listing.dealer_id },
          {
            attempts: 2,
            backoff: { type: "exponential", delay: 60_000 },
            removeOnComplete: { age: 86_400 },
            removeOnFail: { age: 604_800 },
            priority: 5,
          },
        );
        queued++;

        logger.debug("Queued renewal", {
          vehicleId: listing.vehicle_id,
          renewalCount: (listing.renewal_count || 0) + 1,
          vehicle: `${listing.year} ${listing.make} ${listing.model}`,
        });
      }

      logger.info("Listing renewal check completed", {
        eligibleListings: result.rows.length,
        renewalsQueued: queued,
      });
    } catch (err: any) {
      logger.error("Listing renewal cron failed", { error: err.message });
    }
  });

  logger.info("Listing renewal cron started (every hour)");
  return task;
}
