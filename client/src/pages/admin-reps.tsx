import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
import { Users, Loader2, Search } from "lucide-react";

interface AdminRep {
  id: string;
  name: string;
  email: string;
  dealerName: string;
  status: string;
  healthScore: number;
  postsToday: number;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10",
    warming: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10",
    paused: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10",
    flagged: "border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/10",
    banned: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
  };
  return (
    <Badge variant="outline" className={styles[status] ?? ""}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </Badge>
  );
}

function HealthBadge({ score }: { score: number }) {
  let label: string;
  let className: string;
  if (score >= 80) {
    label = "Healthy";
    className = "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10";
  } else if (score >= 50) {
    label = "Warning";
    className = "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10";
  } else {
    label = "Critical";
    className = "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10";
  }
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

export default function AdminReps() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: reps, isLoading } = useQuery<AdminRep[]>({
    queryKey: ["/api/admin/reps"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const filtered = (reps ?? []).filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.dealerName.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Reps</h1>
          <p className="mt-1 text-muted-foreground">
            {reps?.length ?? 0} total reps across all accounts
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border text-foreground"
          />
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5" />
            Sales Reps
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {search ? "No reps match your search." : "No reps found."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Email</TableHead>
                  <TableHead className="text-foreground">Dealer</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Health</TableHead>
                  <TableHead className="text-foreground">Posts Today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rep) => (
                  <TableRow
                    key={rep.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/admin/reps/${rep.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {rep.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rep.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rep.dealerName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={rep.status} />
                    </TableCell>
                    <TableCell>
                      <HealthBadge score={rep.healthScore ?? 0} />
                    </TableCell>
                    <TableCell className="text-foreground">
                      {rep.postsToday}
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
