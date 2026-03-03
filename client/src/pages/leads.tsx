import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, MessageSquare, Loader2 } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicleInterest: string | null;
  score: "cold" | "warm" | "qualified" | null;
  status: string;
  source: string | null;
  repId: string | null;
  repName: string | null;
  createdAt: string;
}

const SCORE_BADGE: Record<string, { className: string; label: string }> = {
  cold: { className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", label: "Cold" },
  warm: { className: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Warm" },
  qualified: { className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Qualified" },
};

const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contacted: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  engaged: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  converted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function Leads() {
  const [, setLocation] = useLocation();
  const { isOwnerOrAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const res = await fetch("/api/leads", { credentials: "include" });
      if (res.status === 404) return [];
      if (res.status === 401) return [];
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    retry: false,
  });

  const leads = data ?? [];

  const filtered = useMemo(() => {
    let list = leads;
    if (scoreFilter !== "all") {
      list = list.filter((l) => l.score === scoreFilter);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.vehicleInterest?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, scoreFilter, search]);

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
        <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {isOwnerOrAdmin ? "All leads across your team" : "Your leads"}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, or vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All scores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scores</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No leads found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {leads.length === 0
                  ? "Leads from Facebook Marketplace messages will appear here."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vehicle Interest</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => {
                  const scoreCfg = lead.score
                    ? SCORE_BADGE[lead.score]
                    : null;
                  const statusClass =
                    STATUS_BADGE[lead.status] ??
                    "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/leads/${lead.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">
                        {lead.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.phone || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.vehicleInterest || "—"}
                      </TableCell>
                      <TableCell>
                        {scoreCfg ? (
                          <Badge variant="outline" className={scoreCfg.className}>
                            {scoreCfg.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass}>
                          {lead.status || "new"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.source || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
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
