import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pause,
  Play,
  RefreshCw,
  Shuffle,
  Loader2,
  Globe,
  User,
  Monitor,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecentPost {
  id: string;
  vehicleTitle: string;
  group: string;
  status: string;
  postedAt: string;
  error?: string;
}

interface RepDetail {
  rep: {
    id: string;
    name: string;
    email: string;
    status: string;
    healthScore: number;
    postsToday: number;
    totalPosts: number;
    rampDay: number;
    facebookEmail: string | null;
    isActive: boolean;
    lastPostAt: string | null;
    createdAt: string;
  };
  dealerName: string;
  recentPosts: RecentPost[];
  proxy: {
    host: string;
    port: number;
    protocol: string;
    geo: string;
  } | null;
}

export default function AdminRepDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<RepDetail>({
    queryKey: ["/api/admin/reps", id],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      await apiRequest("PUT", `/api/admin/reps/${id}/${action}`);
    },
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reps", id] });
      toast({ title: "Action completed", description: `Rep ${action} successful.` });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
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

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">Rep not found.</div>
    );
  }

  const { rep, dealerName, recentPosts, proxy } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/reps")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{rep.name}</h1>
          <p className="text-muted-foreground">
            {rep.email} &middot; {dealerName}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge
              variant="outline"
              className={
                rep.status === "active"
                  ? "mt-1 border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
                  : rep.status === "paused"
                    ? "mt-1 border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
                    : "mt-1"
              }
            >
              {rep.status?.charAt(0).toUpperCase() + rep.status?.slice(1)}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Health Score</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {rep.healthScore ?? 0}/100
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Posts Today</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {rep.postsToday}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ramp Day</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {rep.rampDay}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={rep.status === "paused" || actionMutation.isPending}
          onClick={() => actionMutation.mutate({ action: "pause" })}
        >
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={rep.status === "active" || actionMutation.isPending}
          onClick={() => actionMutation.mutate({ action: "resume" })}
        >
          <Play className="h-4 w-4 mr-2" />
          Resume
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={actionMutation.isPending}
          onClick={() => actionMutation.mutate({ action: "test-login" })}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Test Login
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={actionMutation.isPending}
          onClick={() => actionMutation.mutate({ action: "swap-proxy" })}
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Swap Proxy
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={actionMutation.isPending}
          onClick={() => actionMutation.mutate({ action: "launch-browser" })}
        >
          <Monitor className="h-4 w-4 mr-2" />
          Launch Browser
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={actionMutation.isPending}
          onClick={() => actionMutation.mutate({ action: "reset-profile" })}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Profile
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <User className="h-5 w-5" />
              Rep Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Facebook</span>
              <span className="text-foreground">
                {rep.facebookEmail ?? "Not connected"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Posts</span>
              <span className="text-foreground">{rep.totalPosts}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Post</span>
              <span className="text-foreground">
                {rep.lastPostAt
                  ? new Date(rep.lastPostAt).toLocaleString()
                  : "Never"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">
                {new Date(rep.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Globe className="h-5 w-5" />
              Proxy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {proxy ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Host</span>
                  <span className="text-foreground font-mono">
                    {proxy.host}:{proxy.port}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Protocol</span>
                  <span className="text-foreground uppercase">
                    {proxy.protocol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Geo</span>
                  <span className="text-foreground">{proxy.geo}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No proxy assigned.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No recent posting activity.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Vehicle</TableHead>
                  <TableHead className="text-foreground">Group</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Posted At</TableHead>
                  <TableHead className="text-foreground">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium text-foreground">
                      {post.vehicleTitle}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {post.group}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          post.status === "success"
                            ? "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
                            : "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10"
                        }
                      >
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(post.postedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {post.error ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
