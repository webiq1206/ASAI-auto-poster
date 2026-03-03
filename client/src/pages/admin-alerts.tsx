import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Loader2,
  XCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Alert {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  details: string;
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
    warning: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10",
    info: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  };
  return (
    <Badge variant="outline" className={styles[severity] ?? ""}>
      {severity?.charAt(0).toUpperCase() + severity?.slice(1)}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="border-border text-foreground">
      {type}
    </Badge>
  );
}

export default function AdminAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showResolved, setShowResolved] = useState(false);

  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/admin/alerts"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/alerts/${id}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
      toast({ title: "Resolved", description: "Alert marked as resolved." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed",
        description:
          err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = (alerts ?? []).filter(
    (a) => (showResolved ? a.resolved : !a.resolved),
  );
  const unresolvedCount = (alerts ?? []).filter((a) => !a.resolved).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
          <p className="mt-1 text-muted-foreground">
            {unresolvedCount} unresolved alert{unresolvedCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={!showResolved ? "default" : "outline"}
            size="sm"
            onClick={() => setShowResolved(false)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Unresolved
          </Button>
          <Button
            variant={showResolved ? "default" : "outline"}
            size="sm"
            onClick={() => setShowResolved(true)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Resolved
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {showResolved
                ? "No resolved alerts."
                : "No unresolved alerts. All clear!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <Card
              key={alert.id}
              className={`border-border ${
                alert.severity === "critical" && !alert.resolved
                  ? "border-l-4 border-l-red-500"
                  : alert.severity === "warning" && !alert.resolved
                    ? "border-l-4 border-l-yellow-500"
                    : ""
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <TypeBadge type={alert.type} />
                      <SeverityBadge severity={alert.severity} />
                      {alert.resolved && (
                        <Badge
                          variant="outline"
                          className="border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
                        >
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground">
                      {alert.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {alert.details}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!alert.resolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resolveMutation.isPending}
                      onClick={() => resolveMutation.mutate(alert.id)}
                    >
                      {resolveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
