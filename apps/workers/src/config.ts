function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),
  vpsApiKey: required("VPS_API_KEY"),
  dashboardApiUrl: required("DASHBOARD_API_URL"),
  adspowerApiUrl: optional("ADSPOWER_API_URL", "http://localhost:50325"),
  encryptionKey: required("ENCRYPTION_KEY"),
  nodeEnv: optional("NODE_ENV", "development"),
  get isProduction() {
    return this.nodeEnv === "production";
  },
};
