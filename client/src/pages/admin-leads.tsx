import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Loader2, Search } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  repName: string;
  dealerName: string;
  score: number;
  status: string;
  channel: string;
  createdAt: string;
}

function ScoreBadge({ score }: { score: number }) {
  let className: string;
  if (score >= 80) {
    className = "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10";
  } else if (score >= 50) {
    className = "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10";
  } else {
    className = "border-muted-foreground/50 text-muted-foreground bg-muted";
  }
  return (
    <Badge variant="outline" className={className}>
      {score}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10",
    contacted: "border-purple-500/50 text-purple-600 dark:text-purple-400 bg-purple-500/10",
    qualified: "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10",
    lost: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
    converted: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  };
  return (
    <Badge variant="outline" className={styles[status] ?? ""}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </Badge>
  );
}

export default function AdminLeads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const filtered = (leads ?? []).filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.repName?.toLowerCase().includes(search.toLowerCase()) ||
      lead.dealerName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Leads</h1>
        <p className="mt-1 text-muted-foreground">
          {leads?.length ?? 0} total leads across all accounts
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border text-foreground"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-background border-border text-foreground">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5" />
            Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {search || statusFilter !== "all"
                ? "No leads match your filters."
                : "No leads found."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Rep</TableHead>
                  <TableHead className="text-foreground">Dealer</TableHead>
                  <TableHead className="text-foreground">Score</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Channel</TableHead>
                  <TableHead className="text-foreground">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium text-foreground">
                      {lead.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.repName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.dealerName}
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={lead.score} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {lead.channel}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString()}
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
