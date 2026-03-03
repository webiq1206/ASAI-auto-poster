import cron, { type ScheduledTask } from "node-cron";
import axios from "axios";
import { logger } from "../lib/logger.js";
import { getDb } from "../lib/db.js";

interface DealerFeed {
  id: string;
  dms_feed_url: string;
  dms_provider: string | null;
}

async function parseXmlFeed(content: string): Promise<Record<string, unknown>[]> {
  const vehicles: Record<string, unknown>[] = [];
  const vehicleMatches = content.match(/<vehicle>([\s\S]*?)<\/vehicle>/gi) || [];

  for (const block of vehicleMatches) {
    const extract = (tag: string) => {
      const match = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i"));
      return match?.[1]?.trim() ?? null;
    };

    vehicles.push({
      vin: extract("vin"),
      year: extract("year") ? parseInt(extract("year")!, 10) : null,
      make: extract("make"),
      model: extract("model"),
      trim: extract("trim"),
      price: extract("price") ? parseFloat(extract("price")!) : null,
      mileage: extract("mileage") ? parseInt(extract("mileage")!, 10) : null,
      stock_number: extract("stocknumber") || extract("stock_number"),
    });
  }
  return vehicles;
}

function parseCsvFeed(content: string): Record<string, unknown>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  const vehicles: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const vehicle: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      vehicle[header] = values[idx] ?? null;
    });
    vehicles.push(vehicle);
  }
  return vehicles;
}

async function syncDealerFeed(dealer: DealerFeed): Promise<{ upserted: number; sold: number }> {
  const db = getDb();
  let upserted = 0;
  let sold = 0;

  try {
    const response = await axios.get(dealer.dms_feed_url, { timeout: 30_000 });
    const content = response.data as string;

    const isXml = content.trim().startsWith("<?xml") || content.trim().startsWith("<");
    const vehicles = isXml ? await parseXmlFeed(content) : parseCsvFeed(content);

    logger.info("Parsed DMS feed", { dealerId: dealer.id, vehicleCount: vehicles.length });

    const feedVins = new Set<string>();

    for (const v of vehicles) {
      if (!v.vin) continue;
      feedVins.add(v.vin as string);

      await db.query(
        `INSERT INTO vehicles (dealer_id, vin, year, make, model, trim, price, mileage, stock_number, source, status, last_synced_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'dms', 'active', NOW(), NOW())
         ON CONFLICT (dealer_id, vin) DO UPDATE SET
           year = COALESCE(EXCLUDED.year, vehicles.year),
           make = COALESCE(EXCLUDED.make, vehicles.make),
           model = COALESCE(EXCLUDED.model, vehicles.model),
           trim = COALESCE(EXCLUDED.trim, vehicles.trim),
           price = COALESCE(EXCLUDED.price, vehicles.price),
           mileage = COALESCE(EXCLUDED.mileage, vehicles.mileage),
           stock_number = COALESCE(EXCLUDED.stock_number, vehicles.stock_number),
           last_synced_at = NOW(),
           updated_at = NOW()`,
        [dealer.id, v.vin, v.year, v.make, v.model, v.trim, v.price, v.mileage, v.stock_number],
      );
      upserted++;
    }

    if (feedVins.size > 0) {
      const existing = await db.query(
        "SELECT id, vin FROM vehicles WHERE dealer_id = $1 AND source = 'dms' AND status = 'active'",
        [dealer.id],
      );

      for (const row of existing.rows) {
        if (!feedVins.has(row.vin)) {
          await db.query(
            "UPDATE vehicles SET status = 'sold', updated_at = NOW() WHERE id = $1",
            [row.id],
          );
          sold++;
        }
      }
    }
  } catch (err: any) {
    logger.error("Failed to sync DMS feed", { dealerId: dealer.id, error: err.message });
  }

  return { upserted, sold };
}

export function startDmsSyncCron(): ScheduledTask {
  const task = cron.schedule("0 */2 * * *", async () => {
    try {
      logger.info("Running DMS sync");
      const db = getDb();

      const result = await db.query(`
        SELECT d.id, d.dms_feed_url, d.dms_provider
        FROM dealers d
        WHERE d.dms_feed_url IS NOT NULL
          AND d.dms_feed_url != ''
          AND (d.stripe_subscription_status = 'active' OR d.trial_ends_at > NOW())
      `);

      let totalUpserted = 0;
      let totalSold = 0;

      for (const dealer of result.rows as DealerFeed[]) {
        const { upserted, sold } = await syncDealerFeed(dealer);
        totalUpserted += upserted;
        totalSold += sold;
      }

      logger.info("DMS sync completed", {
        feedsProcessed: result.rows.length,
        totalUpserted,
        totalSold,
      });
    } catch (err: any) {
      logger.error("DMS sync cron failed", { error: err.message });
    }
  });

  logger.info("DMS sync cron started (every 2 hours)");
  return task;
}
