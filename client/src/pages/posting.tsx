import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Send, Loader2 } from "lucide-react";

interface PostingLog {
  id: string;
  vehicleTitle: string;
  repName: string;
  repId: string;
  target: string;
  status: "success" | "failed" | "skipped";
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  success: {
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    label: "Success",
  },
  failed: {
    className: "bg-red-500/20 text-red-400 border-red-500/30",
    label: "Failed",
  },
  skipped: {
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    label: "Skipped",
  },
};

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Posting() {
  const { isOwnerOrAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery<PostingLog[]>({
    queryKey: ["/api/posting-log"],
    queryFn: async () => {
      const res = await fetch("/api/posting-log", { credentials: "include" });
      if (res.status === 404) return [];
      if (res.status === 401) return [];
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    retry: false,
  });

  const logs = data ?? [];

  const filtered = useMemo(() => {
    let list = logs;
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (l) =>
          l.vehicleTitle?.toLowerCase().includes(q) ||
          l.repName?.toLowerCase().includes(q) ||
          l.target?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, statusFilter, search]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Posting Log</h1>
        <p className="text-sm text-muted-foreground">
          {isOwnerOrAdmin
            ? "All posting activity across your team"
            : "Your posting activity"}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vehicle, rep, or target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Send className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No posting activity found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {logs.length === 0
                  ? "Posts will appear here once the system starts posting."
                  : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  {isOwnerOrAdmin && <TableHead>Rep</TableHead>}
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => {
                  const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.skipped;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-foreground">
                        {log.vehicleTitle || "—"}
                      </TableCell>
                      {isOwnerOrAdmin && (
                        <TableCell className="text-muted-foreground">
                          {log.repName || "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground">
                        {log.target || "Marketplace"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(log.durationMs)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
