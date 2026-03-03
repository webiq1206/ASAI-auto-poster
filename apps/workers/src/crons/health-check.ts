import cron, { type ScheduledTask } from "node-cron";
import IORedis from "ioredis";
import axios from "axios";
import { Queue } from "bullmq";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { getDb } from "../lib/db.js";

interface HealthStatus {
  timestamp: string;
  adspower: boolean;
  redis: boolean;
  database: boolean;
  postingQueueDepth: number;
  photoQueueDepth: number;
  cpu?: string;
  ram?: string;
  disk?: string;
  uptime?: string;
  adspower_status?: string;
  adspower_version?: string;
  adspower_seats?: string;
  redis_status?: string;
  redis_memory?: string;
  redis_clients?: string;
  redis_keys?: string;
  posting_queue_depth?: number;
  photo_worker?: boolean;
  posting_worker?: boolean;
  cron_scheduler?: boolean;
}

async function checkAdsPower(): Promise<boolean> {
  try {
    const { data } = await axios.get(`${config.adspowerApiUrl}/api/v1/user/list`, {
      params: { page: 1, page_size: 1 },
      timeout: 5_000,
    });
    return data.code === 0;
  } catch {
    return false;
  }
}

async function checkRedis(connection: IORedis): Promise<boolean> {
  try {
    const result = await connection.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    const db = getDb();
    await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

async function updateRepHealthScores(): Promise<void> {
  const db = getDb();
  try {
    const reps = await db.query(`
      SELECT sr.id, sr.total_posts, sr.total_flags, sr.status, sr.ramp_day,
             sr.posts_today, sr.daily_post_limit
      FROM sales_reps sr
      WHERE sr.is_active = true
    `);

    for (const rep of reps.rows) {
      let score = 100;

      // Deduct for flags (each flag = -10 points)
      score -= (rep.total_flags || 0) * 10;

      // Deduct if rep has low posting consistency
      if (rep.total_posts > 0) {
        const recentResult = await db.query(`
          SELECT COUNT(*) FILTER (WHERE status = 'failed') as failures,
                 COUNT(*) as total
          FROM posting_log
          WHERE rep_id = $1 AND posted_at > NOW() - INTERVAL '7 days'
        `, [rep.id]);

        const stats = recentResult.rows[0];
        if (stats && stats.total > 0) {
          const failRate = parseInt(stats.failures) / parseInt(stats.total);
          score -= Math.round(failRate * 40);
        }
      }

      // Deduct for flagged/banned status
      if (rep.status === "flagged") score -= 30;
      if (rep.status === "banned") score = 0;

      // Bonus for completing daily targets consistently
      if (rep.posts_today >= (rep.daily_post_limit || 10)) {
        score = Math.min(100, score + 5);
      }

      score = Math.max(0, Math.min(100, score));

      await db.query(
        "UPDATE sales_reps SET health_score = $1, last_health_check_at = NOW() WHERE id = $2",
        [score, rep.id],
      );
    }

    logger.info("Rep health scores updated", { repsProcessed: reps.rows.length });
  } catch (err: any) {
    logger.error("Failed to update rep health scores", { error: err.message });
  }
}

export function startHealthCheckCron(): ScheduledTask {
  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  const postingQueue = new Queue("posting", { connection: connection.duplicate() });
  const photoQueue = new Queue("photo", { connection: connection.duplicate() });

  const task = cron.schedule("*/10 * * * *", async () => {
    try {
      const [adspowerOk, redisOk, dbOk, postingCount, photoCount] = await Promise.all([
        checkAdsPower(),
        checkRedis(connection),
        checkDatabase(),
        postingQueue.getWaitingCount().catch(() => -1),
        photoQueue.getWaitingCount().catch(() => -1),
      ]);

      let redisInfo: { memory?: string; clients?: string; keys?: string } = {};
      try {
        const info = await connection.info("memory");
        const memMatch = info.match(/used_memory_human:(\S+)/);
        redisInfo.memory = memMatch?.[1] ?? "unknown";
        const clientInfo = await connection.info("clients");
        const clientMatch = clientInfo.match(/connected_clients:(\d+)/);
        redisInfo.clients = clientMatch?.[1] ?? "unknown";
        const keyCount = await connection.dbsize();
        redisInfo.keys = String(keyCount);
      } catch {}

      let osInfo: { cpu?: string; ram?: string; disk?: string; uptime?: string } = {};
      try {
        const os = await import("os");
        const cpus = os.cpus();
        const cpuIdle = cpus.reduce((acc, c) => acc + c.times.idle, 0) / cpus.length;
        const cpuTotal = cpus.reduce((acc, c) => acc + c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq, 0) / cpus.length;
        osInfo.cpu = `${Math.round(((cpuTotal - cpuIdle) / cpuTotal) * 100)}%`;
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        osInfo.ram = `${Math.round(((totalMem - freeMem) / totalMem) * 100)}%`;
        osInfo.uptime = `${Math.floor(os.uptime() / 3600)}h`;
        osInfo.disk = "N/A";
      } catch {}

      const status: HealthStatus = {
        timestamp: new Date().toISOString(),
        adspower: adspowerOk,
        redis: redisOk,
        database: dbOk,
        postingQueueDepth: postingCount,
        photoQueueDepth: photoCount,
        cpu: osInfo.cpu,
        ram: osInfo.ram,
        disk: osInfo.disk,
        uptime: osInfo.uptime,
        adspower_status: adspowerOk ? "running" : "down",
        redis_status: redisOk ? "connected" : "disconnected",
        redis_memory: redisInfo.memory,
        redis_clients: redisInfo.clients,
        redis_keys: redisInfo.keys,
        posting_queue_depth: postingCount,
        photo_worker: true,
        posting_worker: true,
        cron_scheduler: true,
      };

      const allHealthy = adspowerOk && redisOk && dbOk;
      const logFn = allHealthy ? logger.info.bind(logger) : logger.warn.bind(logger);
      logFn("Health check result", status);

      // Update rep health scores
      if (dbOk) {
        await updateRepHealthScores();
      }

      // Report to dashboard
      try {
        await axios.post(
          `${config.dashboardApiUrl}/api/vps/health`,
          status,
          { headers: { "X-VPS-API-Key": config.vpsApiKey }, timeout: 5_000 },
        );
      } catch (err: any) {
        logger.error("Failed to report health to dashboard", { error: err.message });
      }
    } catch (err: any) {
      logger.error("Health check cron failed", { error: err.message });
    }
  });

  logger.info("Health check cron started (every 10 min)");
  return task;
}
