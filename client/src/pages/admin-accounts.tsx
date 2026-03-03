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
import { Building2, Loader2, Search } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  plan: string;
  repCount: number;
  status: string;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10",
    trial: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10",
    suspended: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
    cancelled: "border-muted-foreground/50 text-muted-foreground bg-muted",
  };
  return (
    <Badge variant="outline" className={styles[status] ?? ""}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </Badge>
  );
}

export default function AdminAccounts() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/admin/accounts"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const filtered = (accounts ?? []).filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase()),
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
          <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
          <p className="mt-1 text-muted-foreground">
            {accounts?.length ?? 0} total accounts
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border text-foreground"
          />
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="h-5 w-5" />
            All Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {search ? "No accounts match your search." : "No accounts found."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Type</TableHead>
                  <TableHead className="text-foreground">Plan</TableHead>
                  <TableHead className="text-foreground">Reps</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((account) => (
                  <TableRow
                    key={account.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/admin/accounts/${account.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {account.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {account.type}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {account.plan}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {account.repCount}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={account.status} />
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
