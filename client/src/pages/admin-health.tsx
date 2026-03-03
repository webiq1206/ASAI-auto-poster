import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Globe,
  Database,
  HardDrive,
  Cog,
  Activity,
} from "lucide-react";

interface HealthData {
  vps: { cpuUsage: string; ramUsage: string; diskUsage: string; uptime: string };
  adspower: { activeProfiles: number; apiStatus: string; version: string; licenseSeats: string };
  worker: { queueDepth: string; lastJob: string; jobsProcessedToday: number; failureRate: number };
  redis: { status: string; memoryUsage: string; connectedClients: string; keys: string };
  database: { status: string; activeConnections: string; size: string; slowQueriesToday: string };
  services: { photoWorker: string; postingWorker: string; cronScheduler: string; webhookReceiver: string };
}

function HealthCard({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ label: string; value: string; status?: "ok" | "warn" | "error" }>;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground text-base">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium">{item.value}</span>
              {item.status && (
                <Badge
                  variant="outline"
                  className={
                    item.status === "ok"
                      ? "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
                      : item.status === "warn"
                        ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
                        : "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10"
                  }
                >
                  {item.status === "ok"
                    ? "OK"
                    : item.status === "warn"
                      ? "Warning"
                      : "Error"}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminHealth() {
  const { data: health, isLoading } = useQuery<HealthData>({
    queryKey: ["/api/admin/health"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const formatLastJob = (val: string) => {
    if (!val || val === "N/A") return "N/A";
    try {
      const d = new Date(val);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "N/A";
    }
  };

  const inferStatus = (val: string): "ok" | "warn" | "error" | undefined => {
    if (!val || val === "N/A" || val === "Awaiting report" || val === "—") return undefined;
    if (val === "running" || val === "ok" || val === "connected") return "ok";
    if (val === "degraded" || val === "warning") return "warn";
    if (val === "down" || val === "error" || val === "disconnected") return "error";
    if (val.includes("%")) {
      const n = parseFloat(val);
      if (n > 90) return "error";
      if (n > 75) return "warn";
      return "ok";
    }
    return "ok";
  };

  const items = health
    ? {
        vps: [
          { label: "CPU Usage", value: health.vps.cpuUsage, status: inferStatus(health.vps.cpuUsage) },
          { label: "RAM Usage", value: health.vps.ramUsage, status: inferStatus(health.vps.ramUsage) },
          { label: "Disk Usage", value: health.vps.diskUsage, status: inferStatus(health.vps.diskUsage) },
          { label: "Uptime", value: health.vps.uptime },
        ],
        adspower: [
          { label: "Active Profiles", value: String(health.adspower.activeProfiles) },
          { label: "API Status", value: health.adspower.apiStatus, status: inferStatus(health.adspower.apiStatus) },
          { label: "Version", value: health.adspower.version },
          { label: "License Seats", value: health.adspower.licenseSeats },
        ],
        worker: [
          { label: "Queue Depth", value: String(health.worker.queueDepth) },
          { label: "Last Job", value: formatLastJob(health.worker.lastJob) },
          { label: "Jobs Processed Today", value: String(health.worker.jobsProcessedToday) },
          {
            label: "Failure Rate",
            value: `${health.worker.failureRate}%`,
            status: health.worker.failureRate > 20 ? ("error" as const) : health.worker.failureRate > 10 ? ("warn" as const) : ("ok" as const),
          },
        ],
        redis: [
          { label: "Status", value: health.redis.status, status: inferStatus(health.redis.status) },
          { label: "Memory Usage", value: health.redis.memoryUsage },
          { label: "Connected Clients", value: health.redis.connectedClients },
          { label: "Keys", value: health.redis.keys },
        ],
        database: [
          { label: "Status", value: health.database.status, status: inferStatus(health.database.status) },
          { label: "Active Connections", value: health.database.activeConnections },
          { label: "Size", value: health.database.size },
          { label: "Slow Queries Today", value: health.database.slowQueriesToday },
        ],
        services: [
          { label: "Photo Worker", value: health.services.photoWorker, status: inferStatus(health.services.photoWorker) },
          { label: "Posting Worker", value: health.services.postingWorker, status: inferStatus(health.services.postingWorker) },
          { label: "Cron Scheduler", value: health.services.cronScheduler, status: inferStatus(health.services.cronScheduler) },
          { label: "Webhook Receiver", value: health.services.webhookReceiver, status: inferStatus(health.services.webhookReceiver) },
        ],
      }
    : null;

  if (isLoading && !health) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Health</h1>
          <p className="mt-1 text-muted-foreground">Infrastructure monitoring dashboard</p>
        </div>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Health</h1>
        <p className="mt-1 text-muted-foreground">
          Infrastructure monitoring dashboard
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HealthCard
          title="VPS"
          icon={Server}
          items={items?.vps ?? [
            { label: "CPU Usage", value: "N/A", status: "ok" },
            { label: "RAM Usage", value: "N/A", status: "ok" },
            { label: "Disk Usage", value: "N/A", status: "ok" },
            { label: "Uptime", value: "N/A" },
          ]}
        />

        <HealthCard
          title="AdsPower"
          icon={Globe}
          items={items?.adspower ?? [
            { label: "Active Profiles", value: "N/A" },
            { label: "API Status", value: "N/A", status: "ok" },
            { label: "Version", value: "N/A" },
            { label: "License Seats", value: "N/A" },
          ]}
        />

        <HealthCard
          title="Worker"
          icon={Cog}
          items={items?.worker ?? [
            { label: "Queue Depth", value: "N/A" },
            { label: "Last Job", value: "N/A" },
            { label: "Jobs Processed Today", value: "N/A" },
            { label: "Failure Rate", value: "N/A%", status: "ok" },
          ]}
        />

        <HealthCard
          title="Redis"
          icon={Database}
          items={items?.redis ?? [
            { label: "Status", value: "N/A", status: "ok" },
            { label: "Memory Usage", value: "N/A" },
            { label: "Connected Clients", value: "N/A" },
            { label: "Keys", value: "N/A" },
          ]}
        />

        <HealthCard
          title="Database"
          icon={HardDrive}
          items={items?.database ?? [
            { label: "Status", value: "N/A", status: "ok" },
            { label: "Active Connections", value: "N/A" },
            { label: "Size", value: "N/A" },
            { label: "Slow Queries Today", value: "N/A" },
          ]}
        />

        <HealthCard
          title="Services"
          icon={Activity}
          items={items?.services ?? [
            { label: "Photo Worker", value: "N/A", status: "ok" },
            { label: "Posting Worker", value: "N/A", status: "ok" },
            { label: "Cron Scheduler", value: "N/A", status: "ok" },
            { label: "Webhook Receiver", value: "N/A", status: "ok" },
          ]}
        />
      </div>
    </div>
  );
}
