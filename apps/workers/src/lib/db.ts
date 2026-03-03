import pg from "pg";
import { config } from "../config.js";
import { logger } from "./logger.js";

let pool: pg.Pool | null = null;

export function getDb(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on("error", (err) => {
      logger.error("Unexpected database pool error", { error: err.message });
    });
  }
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("Database pool closed");
  }
}
