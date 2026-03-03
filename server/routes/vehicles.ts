import { Router } from "express";
import { db } from "../db";
import { vehicles, salesReps, dealers } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";
import { z } from "zod";
import type { AuthScope } from "../lib/scope";

const router = Router();

const createVehicleSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().optional(),
  vin: z.string().optional(),
  stock_number: z.string().optional(),
  body_type: z.string().optional(),
  exterior_color: z.string().optional(),
  interior_color: z.string().optional(),
  mileage: z.number().int().optional(),
  price: z.string().optional(),
  condition: z.string().optional(),
  transmission: z.string().optional(),
  fuel_type: z.string().optional(),
  drivetrain: z.string().optional(),
  engine: z.string().optional(),
  features: z.array(z.string()).optional(),
  description_raw: z.string().optional(),
  photos_original: z.array(z.string()).optional(),
});

router.get("/api/vehicles", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;

  let query = db
    .select()
    .from(vehicles)
    .where(eq(vehicles.dealerId, scope.dealer_id))
    .orderBy(desc(vehicles.createdAt));

  const result = await query;

  // If rep, filter to assigned vehicles only
  if (scope.role === "rep" && scope.rep_id) {
    const [rep] = await db
      .select({ assignedVehicleIds: salesReps.assignedVehicleIds, assignmentMode: salesReps.assignmentMode })
      .from(salesReps)
      .where(eq(salesReps.id, scope.rep_id));

    if (rep?.assignmentMode === "selected" && rep.assignedVehicleIds) {
      return res.json(result.filter((v) => rep.assignedVehicleIds!.includes(v.id)));
    }
  }

  res.json(result);
});

router.get("/api/vehicles/:id", requireAuth, async (req, res) => {
  const scope = req.user as AuthScope;
  const id = req.params.id as string;

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.dealerId, scope.dealer_id)));

  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  res.json(vehicle);
});

router.post(
  "/api/vehicles",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const data = createVehicleSchema.parse(req.body);

      const [vehicle] = await db
        .insert(vehicles)
        .values({
          dealerId: scope.dealer_id,
          year: data.year,
          make: data.make,
          model: data.model,
          trim: data.trim || null,
          vin: data.vin || null,
          stockNumber: data.stock_number || null,
          bodyType: data.body_type || null,
          exteriorColor: data.exterior_color || null,
          interiorColor: data.interior_color || null,
          mileage: data.mileage || null,
          price: data.price || null,
          condition: data.condition || "used",
          transmission: data.transmission || null,
          fuelType: data.fuel_type || null,
          drivetrain: data.drivetrain || null,
          engine: data.engine || null,
          features: data.features || null,
          descriptionRaw: data.description_raw || null,
          photosOriginal: data.photos_original || null,
          source: "manual",
        })
        .returning();

      // Queue photo processing if the dealer has the custom backgrounds feature
      if (vehicle.photosOriginal?.length) {
        try {
          const [dealer] = await db
            .select({ featureCustomBackgrounds: dealers.featureCustomBackgrounds })
            .from(dealers)
            .where(eq(dealers.id, scope.dealer_id));
          if (dealer?.featureCustomBackgrounds && process.env.VPS_API_KEY && process.env.VPS_HEALTH_ENDPOINT) {
            fetch(`${process.env.VPS_HEALTH_ENDPOINT}/api/vps/photos/process`, {
              method: "POST",
              headers: { "X-VPS-API-Key": process.env.VPS_API_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({ vehicle_id: vehicle.id, dealer_id: scope.dealer_id }),
            }).catch(() => {});
          }
        } catch {}
      }

      res.json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      next(err);
    }
  },
);

router.put(
  "/api/vehicles/:id",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const id = req.params.id as string;
      const updates = req.body;

      const [existing] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(eq(vehicles.id, id), eq(vehicles.dealerId, scope.dealer_id)));

      if (!existing) return res.status(404).json({ error: "Vehicle not found" });

      const allowedFields: Record<string, string> = {
        year: "year", make: "make", model: "model", trim: "trim",
        vin: "vin", mileage: "mileage", price: "price", condition: "condition",
        transmission: "transmission", fuel_type: "fuelType", body_type: "bodyType",
        exterior_color: "exteriorColor", interior_color: "interiorColor",
        features: "features", description_raw: "descriptionRaw", status: "status",
      };

      const setValues: Record<string, any> = { updatedAt: new Date() };
      for (const [key, col] of Object.entries(allowedFields)) {
        if (updates[key] !== undefined) {
          setValues[col] = updates[key];
          if (key === "price") {
            setValues.priceChangedAt = new Date();
          }
        }
      }

      const [updated] = await db
        .update(vehicles)
        .set(setValues)
        .where(eq(vehicles.id, id))
        .returning();

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/api/vehicles/:id",
  requireAuth,
  requireOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const scope = req.user as AuthScope;
      const id = req.params.id as string;

      const [existing] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(eq(vehicles.id, id), eq(vehicles.dealerId, scope.dealer_id)));

      if (!existing) return res.status(404).json({ error: "Vehicle not found" });

      await db
        .update(vehicles)
        .set({ status: "deleted", updatedAt: new Date() })
        .where(eq(vehicles.id, id));

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
