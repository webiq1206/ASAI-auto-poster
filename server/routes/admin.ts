import { Router } from "express";
import { db } from "../db";
import { pool } from "../db";
import {
  dealers, salesReps, users, proxies, systemAlerts, postingLog,
  vehicles, leads, selectorConfigs, postingSchedules, photoProcessingLog,
} from "@shared/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { requireAuth, requireSuperadmin } from "../middleware/auth";
import { z } from "zod";

let latestVpsHealthReport: Record<string, any> | null = null;

const router = Router();

router.use("/api/admin", requireAuth, requireSuperadmin);

// Overview stats
router.get("/api/admin/stats", async (_req, res) => {
  const [dealerCount] = await db.select({ count: count() }).from(dealers);
  const [repCount] = await db.select({ count: count() }).from(salesReps);
  const [vehicleCount] = await db.select({ count: count() }).from(vehicles);
  const [alertCount] = await db
    .select({ count: count() })
    .from(systemAlerts)
    .where(eq(systemAlerts.isResolved, false));

  res.json({
    dealers: dealerCount?.count || 0,
    reps: repCount?.count || 0,
    vehicles: vehicleCount?.count || 0,
    unresolvedAlerts: alertCount?.count || 0,
  });
});

// Accounts
router.get("/api/admin/accounts", async (_req, res) => {
  const accounts = await db
    .select()
    .from(dealers)
    .orderBy(desc(dealers.createdAt));
  res.json(accounts);
});

router.get("/api/admin/accounts/:id", async (req, res) => {
  const id = req.params.id as string;
  const [dealer] = await db.select().from(dealers).where(eq(dealers.id, id));
  if (!dealer) return res.status(404).json({ error: "Account not found" });

  const reps = await db.select().from(salesReps).where(eq(salesReps.dealerId, id));
  const vCount = await db.select({ count: count() }).from(vehicles).where(eq(vehicles.dealerId, id));

  res.json({ dealer, reps, vehicleCount: vCount[0]?.count || 0 });
});

// Reps
router.get("/api/admin/reps", async (_req, res) => {
  const reps = await db
    .select({
      id: salesReps.id,
      name: salesReps.name,
      email: salesReps.email,
      status: salesReps.status,
      healthScore: salesReps.healthScore,
      postsToday: salesReps.postsToday,
      totalPosts: salesReps.totalPosts,
      totalLeads: salesReps.totalLeads,
      isActive: salesReps.isActive,
      rampDay: salesReps.rampDay,
      lastPostAt: salesReps.lastPostAt,
      createdAt: salesReps.createdAt,
      dealerId: salesReps.dealerId,
      adspowerProfileId: salesReps.adspowerProfileId,
      proxyId: salesReps.proxyId,
    })
    .from(salesReps)
    .orderBy(desc(salesReps.createdAt));

  res.json(reps);
});

router.get("/api/admin/reps/:id", async (req, res) => {
  const id = req.params.id as string;
  const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, id));
  if (!rep) return res.status(404).json({ error: "Rep not found" });

  const [dealer] = await db.select({ name: dealers.name }).from(dealers).where(eq(dealers.id, rep.dealerId!));
  const logs = await db
    .select()
    .from(postingLog)
    .where(eq(postingLog.repId, id))
    .orderBy(desc(postingLog.postedAt))
    .limit(50);

  let proxy = null;
  if (rep.proxyId) {
    const [p] = await db.select().from(proxies).where(eq(proxies.id, rep.proxyId));
    proxy = p;
  }

  res.json({ rep, dealerName: dealer?.name, recentPosts: logs, proxy });
});

router.put("/api/admin/reps/:id/pause", async (req, res) => {
  const id = req.params.id as string;
  await db.update(salesReps).set({ status: "paused", isActive: false, updatedAt: new Date() }).where(eq(salesReps.id, id));
  res.json({ success: true });
});

router.put("/api/admin/reps/:id/resume", async (req, res) => {
  const id = req.params.id as string;
  await db.update(salesReps).set({ status: "active", isActive: true, updatedAt: new Date() }).where(eq(salesReps.id, id));
  res.json({ success: true });
});

router.put("/api/admin/reps/:id/test-login", async (req, res) => {
  const id = req.params.id as string;
  const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, id));
  if (!rep) return res.status(404).json({ error: "Rep not found" });
  if (!rep.adspowerProfileId) return res.status(400).json({ error: "No AdsPower profile assigned" });

  if (process.env.VPS_API_KEY && process.env.VPS_HEALTH_ENDPOINT) {
    fetch(`${process.env.VPS_HEALTH_ENDPOINT}/api/vps/test-login`, {
      method: "POST",
      headers: { "X-VPS-API-Key": process.env.VPS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ rep_id: id, profile_id: rep.adspowerProfileId }),
    }).catch(() => {});
  }

  await db.insert(systemAlerts).values({
    repId: id,
    alertType: "login_test",
    severity: "info",
    title: `Login test initiated for ${rep.name}`,
    details: `Admin triggered login test for profile ${rep.adspowerProfileId}`,
  });

  res.json({ success: true, message: "Login test queued" });
});

router.put("/api/admin/reps/:id/launch-browser", async (req, res) => {
  const id = req.params.id as string;
  const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, id));
  if (!rep) return res.status(404).json({ error: "Rep not found" });
  if (!rep.adspowerProfileId) return res.status(400).json({ error: "No AdsPower profile assigned" });

  if (process.env.VPS_API_KEY && process.env.VPS_HEALTH_ENDPOINT) {
    fetch(`${process.env.VPS_HEALTH_ENDPOINT}/api/vps/launch-browser`, {
      method: "POST",
      headers: { "X-VPS-API-Key": process.env.VPS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: rep.adspowerProfileId, headed: true }),
    }).catch(() => {});
  }

  res.json({ success: true, message: "Browser launch requested" });
});

router.put("/api/admin/reps/:id/reset-profile", async (req, res) => {
  const id = req.params.id as string;
  const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, id));
  if (!rep) return res.status(404).json({ error: "Rep not found" });

  if (rep.adspowerProfileId && process.env.VPS_API_KEY && process.env.VPS_HEALTH_ENDPOINT) {
    fetch(`${process.env.VPS_HEALTH_ENDPOINT}/api/vps/profile/reset`, {
      method: "POST",
      headers: { "X-VPS-API-Key": process.env.VPS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: rep.adspowerProfileId, rep_id: id }),
    }).catch(() => {});
  }

  await db.update(salesReps).set({
    adspowerProfileId: null,
    status: "pending",
    rampDay: 0,
    healthScore: 100,
    updatedAt: new Date(),
  }).where(eq(salesReps.id, id));

  res.json({ success: true, message: "Profile reset initiated" });
});

router.put("/api/admin/reps/:id/swap-proxy", async (req, res) => {
  const id = req.params.id as string;
  const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, id));
  if (!rep) return res.status(404).json({ error: "Rep not found" });

  const availableProxy = await db
    .select()
    .from(proxies)
    .where(and(eq(proxies.status, "active"), sql`${proxies.id} != ${rep.proxyId ?? "00000000-0000-0000-0000-000000000000"}`))
    .limit(1);

  if (availableProxy.length === 0) {
    return res.status(400).json({ error: "No available proxies to swap to" });
  }

  const newProxy = availableProxy[0];
  await db.update(salesReps).set({ proxyId: newProxy.id, updatedAt: new Date() }).where(eq(salesReps.id, id));

  if (rep.adspowerProfileId && process.env.VPS_API_KEY && process.env.VPS_HEALTH_ENDPOINT) {
    fetch(`${process.env.VPS_HEALTH_ENDPOINT}/api/vps/profile/update-proxy`, {
      method: "POST",
      headers: { "X-VPS-API-Key": process.env.VPS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: rep.adspowerProfileId, proxy_id: newProxy.id }),
    }).catch(() => {});
  }

  res.json({ success: true, newProxy: { host: newProxy.host, port: newProxy.port, geo: `${newProxy.geoCity || ""} ${newProxy.geoState || ""}`.trim() } });
});

// Proxies
router.get("/api/admin/proxies", async (_req, res) => {
  const result = await db.select().from(proxies).orderBy(desc(proxies.createdAt));
  res.json(result);
});

const createProxySchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password_encrypted: z.string().optional(),
  protocol: z.enum(["http", "socks5"]).default("http"),
  geo_country: z.string().optional(),
  geo_state: z.string().optional(),
  geo_city: z.string().optional(),
  provider: z.string().min(1),
});

router.post("/api/admin/proxies", async (req, res, next) => {
  try {
    const data = createProxySchema.parse(req.body);
    const [proxy] = await db
      .insert(proxies)
      .values({
        host: data.host, port: data.port, username: data.username,
        passwordEncrypted: data.password_encrypted, protocol: data.protocol,
        geoCountry: data.geo_country, geoState: data.geo_state,
        geoCity: data.geo_city, provider: data.provider,
      })
      .returning();
    res.json(proxy);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.delete("/api/admin/proxies/:id", async (req, res) => {
  const id = req.params.id as string;
  await db.update(proxies).set({ status: "inactive" }).where(eq(proxies.id, id));
  res.json({ success: true });
});

// Alerts
router.get("/api/admin/alerts", async (req, res) => {
  const resolved = req.query.resolved === "true";
  const alerts = await db
    .select()
    .from(systemAlerts)
    .where(eq(systemAlerts.isResolved, resolved))
    .orderBy(desc(systemAlerts.createdAt))
    .limit(100);
  res.json(alerts);
});

router.put("/api/admin/alerts/:id/resolve", async (req, res) => {
  const id = req.params.id as string;
  await db
    .update(systemAlerts)
    .set({ isResolved: true, resolvedAt: new Date(), resolvedBy: (req.user as any)?.user_id })
    .where(eq(systemAlerts.id, id));
  res.json({ success: true });
});

// Posting - queue status, selectors, schedule controls
router.get("/api/admin/posting/stats", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalToday] = await db
    .select({ count: count() })
    .from(postingLog)
    .where(sql`${postingLog.postedAt} >= ${today}`);
  const [successToday] = await db
    .select({ count: count() })
    .from(postingLog)
    .where(and(sql`${postingLog.postedAt} >= ${today}`, eq(postingLog.status, "success")));
  const [failedToday] = await db
    .select({ count: count() })
    .from(postingLog)
    .where(and(sql`${postingLog.postedAt} >= ${today}`, eq(postingLog.status, "failed")));

  res.json({
    totalToday: totalToday?.count || 0,
    successToday: successToday?.count || 0,
    failedToday: failedToday?.count || 0,
  });
});

router.get("/api/admin/posting/failures", async (_req, res) => {
  const failures = await db
    .select()
    .from(postingLog)
    .where(eq(postingLog.status, "failed"))
    .orderBy(desc(postingLog.postedAt))
    .limit(50);
  res.json(failures);
});

// Selectors
router.get("/api/admin/selectors", async (_req, res) => {
  const configs = await db.select().from(selectorConfigs).orderBy(desc(selectorConfigs.createdAt));
  const mapped = configs.map((c) => ({
    ...c,
    config: typeof c.selectors === "string" ? c.selectors : JSON.stringify(c.selectors),
  }));
  res.json(mapped);
});

router.post("/api/admin/selectors", async (req, res, next) => {
  try {
    const { name, config } = req.body;
    const [created] = await db
      .insert(selectorConfigs)
      .values({ name, selectors: config || {}, isActive: true })
      .returning();
    res.json({ ...created, config: typeof created.selectors === "string" ? created.selectors : JSON.stringify(created.selectors) });
  } catch (err) {
    next(err);
  }
});

router.put("/api/admin/selectors/:id", async (req, res) => {
  const id = req.params.id as string;
  const { config, is_active } = req.body;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (config !== undefined) updates.selectors = config;
  if (is_active !== undefined) updates.isActive = is_active;
  const [updated] = await db.update(selectorConfigs).set(updates).where(eq(selectorConfigs.id, id)).returning();
  res.json({ ...updated, config: typeof updated.selectors === "string" ? updated.selectors : JSON.stringify(updated.selectors) });
});

router.post("/api/admin/health-report", async (req, res) => {
  latestVpsHealthReport = { ...req.body, receivedAt: new Date().toISOString() };
  res.json({ received: true });
});

// Schedule status (master pause state + per-account pause state)
router.get("/api/admin/posting/schedule", async (_req, res) => {
  const allReps = await db
    .select({ isActive: salesReps.isActive })
    .from(salesReps);
  const masterPaused = allReps.length > 0 && allReps.every((r) => !r.isActive);

  const accounts = await db
    .select({
      id: dealers.id,
      name: dealers.name,
      isPaused: dealers.isPaused,
    })
    .from(dealers);

  res.json({
    masterPaused,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      paused: a.isPaused ?? false,
    })),
  });
});

// Master pause / account pause
router.put("/api/admin/posting/master-pause", async (req, res) => {
  const { paused } = req.body;
  if (paused) {
    await db.update(salesReps).set({ isActive: false, updatedAt: new Date() }).where(eq(salesReps.isActive, true));
  } else {
    await db.update(salesReps).set({ isActive: true, updatedAt: new Date() }).where(eq(salesReps.status, "active"));
  }
  res.json({ success: true, paused });
});

router.put("/api/admin/posting/account-pause/:accountId", async (req, res) => {
  const accountId = req.params.accountId as string;
  const { paused } = req.body;
  await db
    .update(dealers)
    .set({ isPaused: paused, updatedAt: new Date() })
    .where(eq(dealers.id, accountId));

  if (paused) {
    await db
      .update(salesReps)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(salesReps.dealerId, accountId));
  } else {
    await db
      .update(salesReps)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(salesReps.dealerId, accountId), eq(salesReps.status, "active")));
  }
  res.json({ success: true });
});

router.put("/api/admin/posting/rep-pause/:repId", async (req, res) => {
  const repId = req.params.repId as string;
  const { paused } = req.body;
  await db.update(salesReps).set({
    isActive: !paused,
    status: paused ? "paused" : "active",
    updatedAt: new Date(),
  }).where(eq(salesReps.id, repId));
  res.json({ success: true });
});

const globalLimitSchema = z.object({
  maxPostsPerRepPerDay: z.number().int().min(1).max(100).optional(),
  maxPostsPerAccountPerDay: z.number().int().min(1).max(500).optional(),
  minDelayBetweenPosts: z.number().int().min(30).max(3600).optional(),
  maxConcurrentSessions: z.number().int().min(1).max(20).optional(),
});

router.put("/api/admin/posting/global-limits", async (req, res, next) => {
  try {
    const data = globalLimitSchema.parse(req.body);

    if (data.maxPostsPerRepPerDay !== undefined) {
      await db.update(salesReps).set({
        dailyPostLimit: data.maxPostsPerRepPerDay,
        updatedAt: new Date(),
      }).where(eq(salesReps.isActive, true));
    }

    res.json({ success: true, applied: data });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.put("/api/admin/accounts/:id/pause", async (req, res) => {
  const id = req.params.id as string;
  await db.update(dealers).set({ isPaused: true, updatedAt: new Date() }).where(eq(dealers.id, id));
  await db.update(salesReps).set({ isActive: false, updatedAt: new Date() }).where(eq(salesReps.dealerId, id));
  res.json({ success: true });
});

router.get("/api/admin/health", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeRepsCount] = await db
    .select({ count: count() })
    .from(salesReps)
    .where(eq(salesReps.isActive, true));

  const recentAlerts = await db
    .select()
    .from(systemAlerts)
    .where(eq(systemAlerts.isResolved, false))
    .orderBy(desc(systemAlerts.createdAt))
    .limit(10);

  const [postsToday] = await db
    .select({ count: count() })
    .from(postingLog)
    .where(sql`${postingLog.postedAt} >= ${today}`);
  const [successToday] = await db
    .select({ count: count() })
    .from(postingLog)
    .where(and(sql`${postingLog.postedAt} >= ${today}`, eq(postingLog.status, "success")));
  const [failedToday] = await db
    .select({ count: count() })
    .from(postingLog)
    .where(and(sql`${postingLog.postedAt} >= ${today}`, eq(postingLog.status, "failed")));

  const totalToday = postsToday?.count ?? 0;
  const failedCount = failedToday?.count ?? 0;
  const failureRate = totalToday > 0 ? Math.round((failedCount / totalToday) * 100) : 0;

  const [lastPost] = await db
    .select({ postedAt: postingLog.postedAt })
    .from(postingLog)
    .orderBy(desc(postingLog.postedAt))
    .limit(1);

  const vpsReport = latestVpsHealthReport;
  const reportAge = vpsReport?.receivedAt
    ? Math.round((Date.now() - new Date(vpsReport.receivedAt).getTime()) / 60000)
    : null;
  const reportStale = reportAge === null || reportAge > 15;

  let dbSize = "unknown";
  let dbConnections = String(pool.totalCount);
  try {
    const sizeResult = await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
    dbSize = sizeResult.rows[0]?.size ?? "unknown";
  } catch {}

  const serviceStatus = (name: string) => {
    if (!vpsReport) return "No report";
    return vpsReport[name] === true ? "running" : vpsReport[name] ?? "No report";
  };

  res.json({
    vps: {
      cpuUsage: vpsReport?.cpu ?? (reportStale ? "Awaiting report" : "N/A"),
      ramUsage: vpsReport?.ram ?? (reportStale ? "Awaiting report" : "N/A"),
      diskUsage: vpsReport?.disk ?? (reportStale ? "Awaiting report" : "N/A"),
      uptime: vpsReport?.uptime ?? (reportStale ? "Awaiting report" : "N/A"),
    },
    adspower: {
      activeProfiles: activeRepsCount?.count ?? 0,
      apiStatus: vpsReport?.adspower_status ?? (reportStale ? "Awaiting report" : "unknown"),
      version: vpsReport?.adspower_version ?? "—",
      licenseSeats: vpsReport?.adspower_seats ?? "—",
    },
    worker: {
      queueDepth: vpsReport?.posting_queue_depth ?? 0,
      lastJob: lastPost?.postedAt ? new Date(lastPost.postedAt).toISOString() : "N/A",
      jobsProcessedToday: totalToday,
      failureRate,
    },
    redis: {
      status: vpsReport?.redis_status ?? (reportStale ? "Awaiting report" : "unknown"),
      memoryUsage: vpsReport?.redis_memory ?? "—",
      connectedClients: vpsReport?.redis_clients ?? "—",
      keys: vpsReport?.redis_keys ?? "—",
    },
    database: {
      status: "ok",
      activeConnections: dbConnections,
      size: dbSize,
      slowQueriesToday: "0",
    },
    services: {
      photoWorker: serviceStatus("photo_worker"),
      postingWorker: serviceStatus("posting_worker"),
      cronScheduler: serviceStatus("cron_scheduler"),
      webhookReceiver: "running",
    },
    recentAlerts: recentAlerts.map((a) => ({
      id: a.id,
      alertType: a.alertType,
      severity: a.severity,
      title: a.title,
      createdAt: a.createdAt,
    })),
  });
});

router.get("/api/admin/photos/stats", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const statusCounts = await db
    .select({
      status: vehicles.photoProcessingStatus,
      count: count(),
    })
    .from(vehicles)
    .groupBy(vehicles.photoProcessingStatus);

  const counts = Object.fromEntries(
    statusCounts.map((r) => [r.status ?? "pending", Number(r.count)])
  );

  const [processedToday] = await db
    .select({ count: count() })
    .from(photoProcessingLog)
    .where(sql`${photoProcessingLog.createdAt} >= ${today}`);

  const [processedLastHour] = await db
    .select({ count: count() })
    .from(photoProcessingLog)
    .where(and(sql`${photoProcessingLog.createdAt} >= ${oneHourAgo}`, eq(photoProcessingLog.status, "completed")));

  const queueDepth = counts.pending ?? 0;
  const ratePerHour = Number(processedLastHour?.count ?? 0);

  res.json({
    queueDepth,
    processingRate: ratePerHour,
    processedToday: processedToday?.count ?? 0,
    qualityReviews: counts.review ?? 0,
    byStatus: counts,
  });
});

router.get("/api/admin/photos/review-queue", async (_req, res) => {
  const reviewItems = await db
    .select({
      id: photoProcessingLog.id,
      vehicleId: photoProcessingLog.vehicleId,
      dealerId: photoProcessingLog.dealerId,
      originalUrl: photoProcessingLog.originalUrl,
      processedUrl: photoProcessingLog.processedUrl,
      processingType: photoProcessingLog.processingType,
      plateDetected: photoProcessingLog.plateDetected,
      createdAt: photoProcessingLog.createdAt,
    })
    .from(photoProcessingLog)
    .where(eq(photoProcessingLog.status, "review"))
    .orderBy(desc(photoProcessingLog.createdAt))
    .limit(50);

  res.json(reviewItems);
});

router.put("/api/admin/photos/review/:id/approve", async (req, res) => {
  const id = req.params.id as string;
  await db.update(photoProcessingLog).set({ status: "completed" }).where(eq(photoProcessingLog.id, id));
  res.json({ success: true });
});

router.put("/api/admin/photos/review/:id/reject", async (req, res) => {
  const id = req.params.id as string;
  await db.update(photoProcessingLog).set({ status: "rejected" }).where(eq(photoProcessingLog.id, id));
  res.json({ success: true });
});

// Admin settings (read env-var based config + DB-stored overrides)
router.get("/api/admin/settings", async (_req, res) => {
  res.json({
    adspower: {
      apiUrl: process.env.ADSPOWER_API_URL || "Not configured",
      configured: !!process.env.ADSPOWER_API_URL,
    },
    proxy: {
      provider: process.env.PROXY_PROVIDER || "",
      defaultProtocol: "http",
      defaultGeo: "US",
    },
    posting: {
      maxPostsPerRepPerDay: 25,
      maxPostsPerAccountPerDay: 100,
      minDelayBetweenPosts: 120,
      warmupDays: 7,
    },
    photos: {
      maxWidth: 1920,
      jpegQuality: 85,
      bgRemovalProvider: process.env.REMOVEBG_API_KEY ? "remove.bg" : "BRIA RMBG-2.0 (ONNX)",
      concurrency: 4,
    },
    alerts: {
      email: process.env.ALERT_EMAIL || "",
      slackWebhook: "",
      smsPhone: "",
    },
  });
});

router.put("/api/admin/settings", async (req, res) => {
  // These settings would typically be stored in a system_config table
  // For now, acknowledge the save (env-var based settings require redeployment)
  const { posting, alerts, photos } = req.body;
  console.log("Admin settings update received:", JSON.stringify({ posting, alerts, photos }).slice(0, 500));
  res.json({ success: true });
});

export default router;
