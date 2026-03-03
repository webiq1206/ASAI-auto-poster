import axios, { type AxiosInstance } from "axios";
import { config } from "../config.js";
import { logger } from "./logger.js";

let client: AxiosInstance;

function getClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: config.adspowerApiUrl,
      timeout: 30_000,
    });
  }
  return client;
}

export interface CreateProfileParams {
  name: string;
  group_id?: string;
  user_proxy_config?: {
    proxy_soft: string;
    proxy_type: string;
    proxy_host: string;
    proxy_port: string;
    proxy_user?: string;
    proxy_password?: string;
  };
  fingerprint_config?: Record<string, unknown>;
}

export interface ProfileInfo {
  user_id: string;
  name: string;
  serial_number: string;
  group_id: string;
  ip: string;
  ip_country: string;
  created_time: string;
}

export async function createProfile(params: CreateProfileParams): Promise<string> {
  const { data } = await getClient().post("/api/v1/user/create", params);
  if (data.code !== 0) throw new Error(`AdsPower create profile failed: ${data.msg}`);
  logger.info("AdsPower profile created", { profileId: data.data.id });
  return data.data.id;
}

export async function startBrowser(profileId: string): Promise<string> {
  const { data } = await getClient().get("/api/v1/browser/start", {
    params: { user_id: profileId },
  });
  if (data.code !== 0) throw new Error(`AdsPower start browser failed: ${data.msg}`);
  const wsUrl = data.data.ws?.puppeteer;
  if (!wsUrl) throw new Error("No WebSocket URL returned from AdsPower");
  logger.info("AdsPower browser started", { profileId, wsUrl });
  return wsUrl;
}

export async function stopBrowser(profileId: string): Promise<void> {
  try {
    const { data } = await getClient().get("/api/v1/browser/stop", {
      params: { user_id: profileId },
    });
    if (data.code !== 0) logger.warn("AdsPower stop browser warning", { msg: data.msg });
    logger.info("AdsPower browser stopped", { profileId });
  } catch (err: any) {
    logger.error("Failed to stop AdsPower browser", { profileId, error: err.message });
  }
}

export async function deleteProfile(profileId: string): Promise<void> {
  const { data } = await getClient().post("/api/v1/user/delete", { user_ids: [profileId] });
  if (data.code !== 0) throw new Error(`AdsPower delete profile failed: ${data.msg}`);
  logger.info("AdsPower profile deleted", { profileId });
}

export async function listProfiles(page = 1, pageSize = 100): Promise<ProfileInfo[]> {
  const { data } = await getClient().get("/api/v1/user/list", {
    params: { page, page_size: pageSize },
  });
  if (data.code !== 0) throw new Error(`AdsPower list profiles failed: ${data.msg}`);
  return data.data.list ?? [];
}

export async function getStatus(profileId: string): Promise<{ status: string; ws?: string }> {
  const { data } = await getClient().get("/api/v1/browser/active", {
    params: { user_id: profileId },
  });
  if (data.code !== 0) return { status: "unknown" };
  return {
    status: data.data.status,
    ws: data.data.ws?.puppeteer,
  };
}
