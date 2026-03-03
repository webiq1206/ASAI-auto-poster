import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import authRoutes from "./routes/auth";
import invitationRoutes from "./routes/invitations";
import facebookRoutes from "./routes/facebook";
import billingRoutes from "./routes/billing";
import stripeWebhook from "./webhooks/stripe";
import teamRoutes from "./routes/team";
import vehicleRoutes from "./routes/vehicles";
import postingRoutes from "./routes/posting";
import adminRoutes from "./routes/admin";
import leadsRoutes from "./routes/leads";
import facebookWebhook from "./webhooks/facebook";
import twilioWebhook from "./webhooks/twilio";
import photosRoutes from "./routes/photos";
import statsRoutes from "./routes/stats";
import settingsRoutes from "./routes/settings";
import vpsRoutes from "./routes/vps";
import groupsRoutes from "./routes/groups";
import schedulesRoutes from "./routes/schedules";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(authRoutes);
  app.use(invitationRoutes);
  app.use(facebookRoutes);
  app.use(billingRoutes);
  app.use(stripeWebhook);
  app.use(teamRoutes);
  app.use(vehicleRoutes);
  app.use(postingRoutes);
  app.use(adminRoutes);
  app.use(leadsRoutes);
  app.use(facebookWebhook);
  app.use(twilioWebhook);
  app.use(photosRoutes);
  app.use(statsRoutes);
  app.use(settingsRoutes);
  app.use(vpsRoutes);
  app.use(groupsRoutes);
  app.use(schedulesRoutes);

  app.get("/api/health", async (_req, res) => {
    try {
      const result = await pool.query("SELECT COUNT(*) FROM dealers");
      res.json({
        status: "ok",
        database: "connected",
        dealers_count: result.rows[0].count,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        database: "disconnected",
        error: String(error),
      });
    }
  });

  return httpServer;
}
