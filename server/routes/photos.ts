import { Router } from "express";
import path from "path";
import { readPhoto, fromPhotoUrl } from "../lib/photo-storage";
import { requireAuth, requireSuperadmin } from "../middleware/auth";
import { db } from "../db";
import { vehicles } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { AuthScope } from "../lib/scope";

const router = Router();

// Serve photos from VPS storage
router.get("/api/photos/*", async (req, res) => {
  const photoPath = (req.params as any)[0] as string;
  if (!photoPath) return res.status(400).json({ error: "No path" });

  const DATA_DIR = process.env.PHOTO_STORAGE_PATH || "/data";
  const fullPath = path.join(DATA_DIR, photoPath);

  // Prevent directory traversal
  if (!fullPath.startsWith(DATA_DIR)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const buffer = await readPhoto(fullPath);
  if (!buffer) return res.status(404).json({ error: "Photo not found" });

  const ext = path.extname(photoPath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };

  res.type(mimeTypes[ext] || "image/jpeg").send(buffer);
});

// Vehicle photo status for dashboard
router.get("/api/vehicles/:id/photo-status", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;
  const id = req.params.id as string;

  const [vehicle] = await db
    .select({
      photosOriginal: vehicles.photosOriginal,
      photosProcessed: vehicles.photosProcessed,
    })
    .from(vehicles)
    .where(eq(vehicles.id, id));

  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  const hasProcessed = (vehicle.photosProcessed?.length ?? 0) > 0;
  const hasOriginal = (vehicle.photosOriginal?.length ?? 0) > 0;
  let status = "none";
  if (hasProcessed) status = "complete";
  else if (hasOriginal) status = "pending";

  res.json({
    status,
    originalCount: vehicle.photosOriginal?.length || 0,
    processedCount: vehicle.photosProcessed?.length || 0,
  });
});

export default router;
