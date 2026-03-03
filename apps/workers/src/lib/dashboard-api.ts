import axios, { type AxiosInstance } from "axios";
import { config } from "../config.js";
import { logger } from "./logger.js";

let client: AxiosInstance;

function getClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: config.dashboardApiUrl,
      timeout: 15_000,
      headers: { "X-VPS-API-Key": config.vpsApiKey },
    });
  }
  return client;
}

export interface Vehicle {
  id: number;
  dealer_id: number;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price?: number;
  mileage?: number;
  description?: string;
  photo_urls: string[];
  status: string;
}

export interface PostLogData {
  rep_id: number;
  dealer_id: number;
  vehicle_id: number;
  status: "success" | "failed";
  marketplace_listing_id?: string;
  screenshot_url?: string;
  error_message?: string;
  duration_ms?: number;
}

export interface PostingConfig {
  selectors: Record<string, string>;
  delays: { keystroke_min: number; keystroke_max: number; field_pause_min: number; field_pause_max: number };
  warm_up: { standard_min_minutes: number; standard_max_minutes: number; extended_threshold_hours: number };
  schedule: { window_start_hour: number; window_end_hour: number };
}

export async function getNextVehicle(repId: number): Promise<Vehicle | null> {
  try {
    const { data } = await getClient().get(`/api/vps/vehicles/next`, { params: { rep_id: repId } });
    return data.vehicle ?? null;
  } catch (err: any) {
    logger.error("Failed to get next vehicle", { repId, error: err.message });
    return null;
  }
}

export async function logPost(data: PostLogData): Promise<void> {
  try {
    await getClient().post(`/api/vps/posts/log`, data);
  } catch (err: any) {
    logger.error("Failed to log post", { error: err.message });
  }
}

export async function getConfig(): Promise<PostingConfig> {
  try {
    const { data } = await getClient().get(`/api/vps/config`);
    return data;
  } catch (err: any) {
    logger.error("Failed to fetch config, using defaults", { error: err.message });
    return {
      selectors: {},
      delays: { keystroke_min: 40, keystroke_max: 100, field_pause_min: 200, field_pause_max: 800 },
      warm_up: { standard_min_minutes: 2, standard_max_minutes: 5, extended_threshold_hours: 48 },
      schedule: { window_start_hour: 8, window_end_hour: 21 },
    };
  }
}
