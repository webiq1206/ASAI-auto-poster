import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  MessageSquare,
  Users,
  Send,
  TrendingUp,
  Activity,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

async function fetchWithFallback<T>(url: string, fallback: T): Promise<T | null> {
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 401) return null;
  if (res.status === 404 || !res.ok) return fallback;
  return (await res.json()) as T;
}

function StatCard({
  icon: Icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  isLoading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden border-border">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                value
              )}
            </p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityItem {
  id: string;
  activityType: string;
  details: Record<string, any> | null;
  createdAt: string;
}

interface ChartDataPoint {
  date: string;
  success: number;
  failed: number;
}

const activityIcons: Record<string, typeof Activity> = {
  post_attempt: Send,
  post_success: CheckCircle,
  post_failed: AlertTriangle,
  login: Users,
  lead_interaction: MessageSquare,
  settings_change: TrendingUp,
};

function formatActivityLabel(type: string, details: Record<string, any> | null): string {
  switch (type) {
    case "post_attempt":
      return details?.status === "success" ? "Vehicle posted successfully" : "Posting attempt";
    case "post_success":
      return "Vehicle posted to Marketplace";
    case "post_failed":
      return `Posting failed: ${details?.error ?? "unknown error"}`;
    case "login":
      return "User logged in";
    case "lead_interaction":
      return `Lead interaction: ${details?.action ?? "message"}`;
    case "settings_change":
      return "Settings updated";
    default:
      return type.replace(/_/g, " ");
  }
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();

  const vehiclesQuery = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const teamQuery = useQuery({
    queryKey: ["/api/team"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: user?.role === "owner" || user?.role === "admin",
  });

  const leadsTodayQuery = useQuery({
    queryKey: ["/api/leads"],
    queryFn: async () => fetchWithFallback<unknown[]>("/api/leads", []),
    retry: false,
  });

  const postsTodayQuery = useQuery({
    queryKey: ["/api/stats/posts-today"],
    queryFn: async () => fetchWithFallback<number>("/api/stats/posts-today", 0),
    retry: false,
  });

  const activityQuery = useQuery<ActivityItem[]>({
    queryKey: ["/api/stats/activity"],
    queryFn: async () => {
      const res = await fetch("/api/stats/activity", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const chartQuery = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/stats/posting-chart"],
    queryFn: async () => {
      const res = await fetch("/api/stats/posting-chart", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const responseTimeQuery = useQuery<{ avgMinutes: number | null }>({
    queryKey: ["/api/stats/response-time"],
    queryFn: async () => {
      const res = await fetch("/api/stats/response-time", { credentials: "include" });
      if (!res.ok) return { avgMinutes: null };
      return res.json();
    },
    retry: false,
  });

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = user.user?.name ?? "there";
  const dealerName = user.dealer?.name ?? "";
  const isOwnerOrAdmin = user.role === "owner" || user.role === "admin";
  const isRep = user.role === "rep";
  const isIndividual = user.account_type === "individual";

  const vehiclesCount =
    vehiclesQuery.data === null || vehiclesQuery.error
      ? "--"
      : Array.isArray(vehiclesQuery.data) ? vehiclesQuery.data.length : "--";
  const teamCount =
    teamQuery.data === null || teamQuery.error
      ? "--"
      : Array.isArray(teamQuery.data) ? teamQuery.data.length : "--";
  const leadsData = leadsTodayQuery.data as unknown;
  const leadsTodayCount = Array.isArray(leadsData)
    ? leadsData.length
    : typeof leadsData === "number" ? leadsData : "--";
  const postsData = postsTodayQuery.data as unknown;
  const postsTodayValue =
    typeof postsData === "number"
      ? postsData
      : Array.isArray(postsData) ? postsData.length : "--";

  const responseTime = responseTimeQuery.data?.avgMinutes;
  const responseTimeDisplay = responseTime !== null && responseTime !== undefined
    ? responseTime < 60 ? `${responseTime}m` : `${Math.round(responseTime / 60)}h`
    : "--";

  const activities = activityQuery.data ?? [];
  const chartData = chartQuery.data ?? [];

  return (
    <div className="space-y-8 bg-background" data-testid="page-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {displayName}
        </h1>
        {dealerName && (
          <p className="mt-1 text-muted-foreground">{dealerName}</p>
        )}
      </div>

      {isRep ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Car} label="My Vehicles" value={vehiclesCount} isLoading={vehiclesQuery.isLoading} />
          <StatCard icon={MessageSquare} label="My Leads" value={leadsTodayCount} isLoading={leadsTodayQuery.isLoading} />
          <StatCard icon={Send} label="My Posts Today" value={postsTodayValue} isLoading={postsTodayQuery.isLoading} />
          <StatCard icon={Clock} label="Avg Response Time" value={responseTimeDisplay} isLoading={responseTimeQuery.isLoading} />
        </div>
      ) : isIndividual ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Car} label="Total Vehicles" value={vehiclesCount} isLoading={vehiclesQuery.isLoading} />
          <StatCard icon={MessageSquare} label="Leads" value={leadsTodayCount} isLoading={leadsTodayQuery.isLoading} />
          <StatCard icon={Send} label="Posts Today" value={postsTodayValue} isLoading={postsTodayQuery.isLoading} />
          <StatCard icon={Clock} label="Avg Response Time" value={responseTimeDisplay} isLoading={responseTimeQuery.isLoading} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Car} label="Total Vehicles" value={vehiclesCount} isLoading={vehiclesQuery.isLoading} />
          <StatCard icon={MessageSquare} label="Leads" value={leadsTodayCount} isLoading={leadsTodayQuery.isLoading} />
          <StatCard icon={Users} label="Team Size" value={teamCount} isLoading={teamQuery.isLoading} />
          <StatCard icon={Send} label="Posts Today" value={postsTodayValue} isLoading={postsTodayQuery.isLoading} />
        </div>
      )}

      {chartData.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5" />
              Posting Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="success" fill="hsl(142, 71%, 45%)" name="Successful" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill="hsl(0, 84%, 60%)" name="Failed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground mt-1">
                Posts, leads, and team actions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 10).map((item) => {
                const IconComp = activityIcons[item.activityType] ?? Activity;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-lg border border-border p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <IconComp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {formatActivityLabel(item.activityType, item.details as Record<string, any> | null)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(item.createdAt)}
                      </p>
                    </div>
                    {item.activityType.includes("fail") && (
                      <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10 text-xs">
                        Failed
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
