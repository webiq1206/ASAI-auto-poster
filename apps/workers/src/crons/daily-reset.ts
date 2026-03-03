import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../lib/logger.js";
import { getDb } from "../lib/db.js";

export function startDailyResetCron(): ScheduledTask {
  const task = cron.schedule("0 0 * * *", async () => {
    try {
      logger.info("Running daily reset");
      const db = getDb();

      // Reset posts_today for all reps
      const resetResult = await db.query("UPDATE sales_reps SET posts_today = 0");
      logger.info("Reset posts_today for all reps", { affected: resetResult.rowCount });

      // Increment ramp_day for warming reps
      const rampResult = await db.query(
        "UPDATE sales_reps SET ramp_day = ramp_day + 1 WHERE status = 'warming'",
      );
      logger.info("Incremented ramp_day for warming reps", { affected: rampResult.rowCount });

      // Graduate reps who have completed 14-day ramp
      const graduateResult = await db.query(
        "UPDATE sales_reps SET status = 'active' WHERE status = 'warming' AND ramp_day >= 14",
      );
      if (graduateResult.rowCount && graduateResult.rowCount > 0) {
        logger.info("Graduated warming reps to active", { count: graduateResult.rowCount });
      }

      logger.info("Daily reset completed");
    } catch (err: any) {
      logger.error("Daily reset cron failed", { error: err.message });
    }
  });

  logger.info("Daily reset cron started (midnight)");
  return task;
}
