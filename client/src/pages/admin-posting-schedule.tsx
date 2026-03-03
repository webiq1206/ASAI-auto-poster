import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Pause,
  Play,
  AlertTriangle,
  Loader2,
  Settings,
  Users,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleStatus {
  masterPaused: boolean;
  accounts: Array<{ id: string; name: string; paused: boolean }>;
  reps?: Array<{ id: string; name: string; dealerName: string; isActive: boolean; status: string }>;
}

interface RepItem {
  id: string;
  name: string;
  isActive: boolean;
  status: string;
  dealerId: string;
}

export default function AdminPostingSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: schedule, isLoading } = useQuery<ScheduleStatus>({
    queryKey: ["/api/admin/posting/schedule"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: allReps = [] } = useQuery<RepItem[]>({
    queryKey: ["/api/admin/reps"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [maxPerRep, setMaxPerRep] = useState("25");
  const [maxPerAccount, setMaxPerAccount] = useState("100");
  const [minDelay, setMinDelay] = useState("120");
  const [maxConcurrent, setMaxConcurrent] = useState("3");

  const masterPauseMutation = useMutation({
    mutationFn: async (paused: boolean) => {
      await apiRequest("PUT", "/api/admin/posting/master-pause", { paused });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posting/schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reps"] });
      toast({ title: "Updated", description: "Master pause toggled." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed", description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong" });
    },
  });

  const accountPauseMutation = useMutation({
    mutationFn: async ({ accountId, paused }: { accountId: string; paused: boolean }) => {
      await apiRequest("PUT", `/api/admin/posting/account-pause/${accountId}`, { paused });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posting/schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reps"] });
      toast({ title: "Updated", description: "Account pause toggled." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed", description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong" });
    },
  });

  const repPauseMutation = useMutation({
    mutationFn: async ({ repId, paused }: { repId: string; paused: boolean }) => {
      await apiRequest("PUT", `/api/admin/posting/rep-pause/${repId}`, { paused });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reps"] });
      toast({ title: "Updated", description: "Rep pause toggled." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed", description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong" });
    },
  });

  const globalLimitsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/posting/global-limits", {
        maxPostsPerRepPerDay: Number(maxPerRep),
        maxPostsPerAccountPerDay: Number(maxPerAccount),
        minDelayBetweenPosts: Number(minDelay),
        maxConcurrentSessions: Number(maxConcurrent),
      });
    },
    onSuccess: () => {
      toast({ title: "Limits applied", description: "Global posting limits updated." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed", description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const masterPaused = schedule?.masterPaused ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Schedule Controls</h1>
        <p className="mt-1 text-muted-foreground">
          Master pause, per-account, per-rep, and global limit controls
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-5 w-5" />
            Master Pause
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-foreground">All Posting Activity</p>
              <p className="text-sm text-muted-foreground">
                {masterPaused ? "Posting is paused globally. No posts will go out." : "Posting is active system-wide."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={masterPaused ? "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10" : "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"}>
                {masterPaused ? "Paused" : "Active"}
              </Badge>
              <Button
                variant={masterPaused ? "default" : "destructive"}
                size="sm"
                disabled={masterPauseMutation.isPending}
                onClick={() => masterPauseMutation.mutate(!masterPaused)}
              >
                {masterPaused ? <><Play className="h-4 w-4 mr-2" />Resume All</> : <><Pause className="h-4 w-4 mr-2" />Pause All</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="h-5 w-5" />
            Per-Account Pause
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!schedule?.accounts || schedule.accounts.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">No accounts found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Account</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium text-foreground">{account.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={account.paused ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10" : "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"}>
                        {account.paused ? "Paused" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" disabled={accountPauseMutation.isPending} onClick={() => accountPauseMutation.mutate({ accountId: account.id, paused: !account.paused })}>
                        {account.paused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                        {account.paused ? "Resume" : "Pause"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5" />
            Per-Rep Pause
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allReps.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">No reps found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Rep</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allReps.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium text-foreground">{rep.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={rep.isActive ? "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10" : "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"}>
                        {rep.isActive ? "Active" : rep.status === "paused" ? "Paused" : rep.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" disabled={repPauseMutation.isPending} onClick={() => repPauseMutation.mutate({ repId: rep.id, paused: rep.isActive })}>
                        {rep.isActive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                        {rep.isActive ? "Pause" : "Resume"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Settings className="h-5 w-5" />
            Global Limit Overrides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-foreground">Max Posts Per Rep Per Day</Label>
              <Input type="number" min={1} max={100} value={maxPerRep} onChange={(e) => setMaxPerRep(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Max Posts Per Account Per Day</Label>
              <Input type="number" min={1} max={500} value={maxPerAccount} onChange={(e) => setMaxPerAccount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Min Delay Between Posts (seconds)</Label>
              <Input type="number" min={30} max={3600} value={minDelay} onChange={(e) => setMinDelay(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Max Concurrent Posting Sessions</Label>
              <Input type="number" min={1} max={20} value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => globalLimitsMutation.mutate()} disabled={globalLimitsMutation.isPending}>
              {globalLimitsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Apply Limits
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Applies max posts per rep to all currently active reps. Account-level and concurrent session limits are enforced by the worker scheduler.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
