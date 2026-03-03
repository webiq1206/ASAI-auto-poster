import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
  Send,
  CheckCircle,
  XCircle,
  Settings2,
  Clock,
  Loader2,
} from "lucide-react";

interface PostingStats {
  totalToday: number;
  successToday: number;
  failedToday: number;
}

interface Failure {
  id: string;
  repName: string;
  dealerName: string;
  vehicleTitle: string;
  error: string;
  failedAt: string;
}

export default function AdminPosting() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<PostingStats>({
    queryKey: ["/api/admin/posting/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: failures, isLoading: failuresLoading } = useQuery<Failure[]>({
    queryKey: ["/api/admin/posting/failures"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const isLoading = statsLoading || failuresLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Posting Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Monitor and manage automated posting
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/admin/posting/selectors")}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Selectors
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/admin/posting/schedule")}
          >
            <Clock className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden border-border">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Today</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    stats?.totalToday ?? 0
                  )}
                </p>
              </div>
              <Send className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-border">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    stats?.successToday ?? 0
                  )}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-border">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    stats?.failedToday ?? 0
                  )}
                </p>
              </div>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <XCircle className="h-5 w-5 text-red-500" />
            Recent Failures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failuresLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !failures || failures.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No failures today.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Rep</TableHead>
                  <TableHead className="text-foreground">Dealer</TableHead>
                  <TableHead className="text-foreground">Vehicle</TableHead>
                  <TableHead className="text-foreground">Error</TableHead>
                  <TableHead className="text-foreground">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium text-foreground">
                      {f.repName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.dealerName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.vehicleTitle}
                    </TableCell>
                    <TableCell className="text-sm max-w-[250px]">
                      <Badge
                        variant="outline"
                        className="border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10 font-normal truncate max-w-full"
                      >
                        {f.error}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(f.failedAt).toLocaleTimeString()}
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
