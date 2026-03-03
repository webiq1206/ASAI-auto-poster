import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { getDb } from "../lib/db.js";
import { processPhotos } from "../jobs/process-photo.js";

interface PhotoJobData {
  vehicle_id: number;
  dealer_id: number;
  photo_urls: string[];
}

async function processPhotoJob(job: Job<PhotoJobData>): Promise<void> {
  const { vehicle_id, dealer_id, photo_urls } = job.data;

  logger.info("Processing photo job", {
    jobId: job.id,
    vehicleId: vehicle_id,
    dealerId: dealer_id,
    photoCount: photo_urls.length,
  });

  try {
    await job.updateProgress(10);

    const result = await processPhotos(vehicle_id, photo_urls);

    await job.updateProgress(80);

    const db = getDb();
    await db.query(
      "UPDATE vehicles SET photos_processed = $1, photo_processing_status = 'completed', updated_at = NOW() WHERE id = $2",
      [result.processedUrls, vehicle_id],
    );

    if (result.plateDetected) {
      await db.query(
        `INSERT INTO photo_processing_log (dealer_id, vehicle_id, original_url, processed_url, processing_type, status, plate_detected)
         VALUES ($1, $2, $3, $4, 'plate_blur', 'completed', true)`,
        [dealer_id, vehicle_id, photo_urls[0] || "", result.processedUrls[0] || ""],
      );
    }

    await job.updateProgress(100);
    logger.info("Photo job completed", {
      jobId: job.id,
      vehicleId: vehicle_id,
      processedCount: result.processedUrls.length,
      plateDetected: result.plateDetected,
      backgroundRemoved: result.backgroundRemoved,
    });
  } catch (err: any) {
    logger.error("Photo job failed", {
      jobId: job.id,
      vehicleId: vehicle_id,
      error: err.message,
    });
    throw err;
  }
}

export function createPhotoWorker(): Worker<PhotoJobData> {
  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker<PhotoJobData>("photo", processPhotoJob, {
    connection,
    concurrency: 2,
    lockDuration: 120_000,
  });

  worker.on("completed", (job) => {
    logger.info("Photo job completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error("Photo job failed", { jobId: job?.id, error: err.message });
  });

  worker.on("error", (err) => {
    logger.error("Photo worker error", { error: err.message });
  });

  logger.info("Photo worker initialized");
  return worker;
}
