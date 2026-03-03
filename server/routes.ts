import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  app.get("/api/posting/next", async (_req, res) => {
    res.json({ status: "not_implemented", endpoint: "GET /api/posting/next" });
  });

  app.post("/api/posting/log", async (_req, res) => {
    res.json({ status: "not_implemented", endpoint: "POST /api/posting/log" });
  });

  app.get("/api/posting/config", async (_req, res) => {
    res.json({ status: "not_implemented", endpoint: "GET /api/posting/config" });
  });

  app.post("/api/webhooks/facebook", async (_req, res) => {
    res.json({ status: "not_implemented", endpoint: "POST /api/webhooks/facebook" });
  });

  app.post("/api/webhooks/stripe", async (_req, res) => {
    res.json({ status: "not_implemented", endpoint: "POST /api/webhooks/stripe" });
  });

  app.post("/api/webhooks/twilio", async (_req, res) => {
    res.json({ status: "not_implemented", endpoint: "POST /api/webhooks/twilio" });
  });

  app.get("/api/admin", async (_req, res) => {
    res.json({ status: "not_implemented", endpoint: "GET /api/admin" });
  });

  app.get("/api/billing", async (_req, res) => {
    res.json({ status: "not_implemented", endpoint: "GET /api/billing" });
  });

  return httpServer;
}
