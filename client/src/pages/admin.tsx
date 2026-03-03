import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Car, AlertTriangle, Loader2 } from "lucide-react";

interface AdminStats {
  dealers: number;
  reps: number;
  vehicles: number;
  unresolvedAlerts: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  gradient: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden border-border">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
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

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  return (
    <div className="space-y-8 bg-background">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="mt-1 text-muted-foreground">System-wide metrics at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Dealers"
          value={stats?.dealers ?? "--"}
          gradient="from-blue-500 to-cyan-500"
          isLoading={isLoading}
        />
        <StatCard
          icon={Users}
          label="Reps"
          value={stats?.reps ?? "--"}
          gradient="from-purple-500 to-pink-500"
          isLoading={isLoading}
        />
        <StatCard
          icon={Car}
          label="Vehicles"
          value={stats?.vehicles ?? "--"}
          gradient="from-green-500 to-emerald-500"
          isLoading={isLoading}
        />
        <StatCard
          icon={AlertTriangle}
          label="Unresolved Alerts"
          value={stats?.unresolvedAlerts ?? "--"}
          gradient="from-orange-500 to-red-500"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
