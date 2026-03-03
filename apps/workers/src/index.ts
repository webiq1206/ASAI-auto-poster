import { logger } from "./lib/logger.js";
import { closeDb } from "./lib/db.js";
import { createPostingWorker } from "./workers/posting-worker.js";
import { createPhotoWorker } from "./workers/photo-worker.js";
import { startSchedulePostsCron } from "./crons/schedule-posts.js";
import { startDailyResetCron } from "./crons/daily-reset.js";
import { startHealthCheckCron } from "./crons/health-check.js";
import { startDmsSyncCron } from "./crons/dms-sync.js";
import { startListingRenewalCron } from "./crons/listing-renewal.js";

async function main(): Promise<void> {
  logger.info("=== Quantum Connect AI Worker Starting ===");
  logger.info("Environment", { nodeEnv: process.env.NODE_ENV || "development" });

  // Initialize BullMQ workers
  const postingWorker = createPostingWorker();
  const photoWorker = createPhotoWorker();
  logger.info("BullMQ workers initialized", { queues: ["posting", "photo"] });

  // Initialize cron jobs
  const scheduleCron = startSchedulePostsCron();
  const dailyResetCron = startDailyResetCron();
  const healthCheckCron = startHealthCheckCron();
  const dmsSyncCron = startDmsSyncCron();
  const renewalCron = startListingRenewalCron();
  logger.info("Cron jobs initialized", {
    crons: ["schedule-posts", "daily-reset", "health-check", "dms-sync", "listing-renewal"],
  });

  logger.info("=== Quantum Connect AI Worker Ready ===");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    scheduleCron.stop();
    dailyResetCron.stop();
    healthCheckCron.stop();
    dmsSyncCron.stop();
    renewalCron.stop();
    logger.info("Cron jobs stopped");

    await postingWorker.close();
    await photoWorker.close();
    logger.info("BullMQ workers closed");

    await closeDb();

    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
    shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", { error: err.message, stack: err.stack });
  process.exit(1);
});
