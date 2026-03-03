import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
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
  Camera,
  Clock,
  Gauge,
  ToggleLeft,
  CheckSquare,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhotoStats {
  queueDepth: number;
  processingRate: number;
  processedToday: number;
  qualityReviews: number;
}

interface ReviewItem {
  id: string;
  vehicleId: string;
  dealerId: string;
  originalUrl: string;
  processedUrl: string | null;
  processingType: string;
  plateDetected: boolean;
  createdAt: string;
}

function PlaceholderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className="rounded-lg border border-border p-2">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPhotos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<PhotoStats>({
    queryKey: ["/api/admin/photos/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: reviewQueue = [], isLoading: reviewLoading } = useQuery<ReviewItem[]>({
    queryKey: ["/api/admin/photos/review-queue"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/photos/review/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/photos/review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/photos/stats"] });
      toast({ title: "Approved" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/admin/photos/review/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/photos/review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/photos/stats"] });
      toast({ title: "Rejected" });
    },
  });

  const queueDepth = stats?.queueDepth ?? "--";
  const processingRate = stats?.processingRate ?? 0;
  const processedToday = stats?.processedToday ?? "--";
  const qualityReviews = stats?.qualityReviews ?? "--";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Photo Processing</h1>
        <p className="mt-1 text-muted-foreground">
          Monitor and manage vehicle photo processing pipeline
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlaceholderStat icon={Clock} label="Queue Depth" value={statsLoading ? "..." : String(queueDepth)} />
        <PlaceholderStat icon={Gauge} label="Processing Rate" value={statsLoading ? "..." : `${processingRate}/hr`} />
        <PlaceholderStat icon={Camera} label="Processed Today" value={statsLoading ? "..." : String(processedToday)} />
        <PlaceholderStat icon={CheckSquare} label="Quality Reviews" value={statsLoading ? "..." : String(qualityReviews)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ToggleLeft className="h-5 w-5" />
              Processing Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Free Tier</p>
                <p className="text-sm text-muted-foreground">BRIA RMBG-2.0 + YOLOv8 (ONNX)</p>
              </div>
              <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10">Active</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Paid Tier</p>
                <p className="text-sm text-muted-foreground">remove.bg API ($0.05/image)</p>
              </div>
              <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground bg-muted">Inactive</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CheckSquare className="h-5 w-5" />
              Quality Review Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reviewQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Check className="h-10 w-10 text-green-500/50 mb-3" />
                <p className="text-muted-foreground">Queue is clear</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Photos flagged for review will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {reviewQueue.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        Vehicle {item.vehicleId?.slice(0, 8)}...
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{item.processingType}</Badge>
                        {item.plateDetected && (
                          <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">Plate detected</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        onClick={() => approveMutation.mutate(item.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => rejectMutation.mutate(item.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Processing Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats && Object.entries(stats as any).filter(([k]) => k === "byStatus").flatMap(([, v]) =>
                Object.entries(v as Record<string, number>).map(([status, cnt]) => (
                  <TableRow key={status}>
                    <TableCell className="font-medium text-foreground capitalize">{status || "pending"}</TableCell>
                    <TableCell className="text-foreground">{String(cnt)}</TableCell>
                  </TableRow>
                ))
              )}
              {!stats && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
