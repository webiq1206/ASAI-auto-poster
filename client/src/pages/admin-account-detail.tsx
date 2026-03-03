import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
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
import { ArrowLeft, Building2, Users, Car, Loader2 } from "lucide-react";

interface Rep {
  id: string;
  name: string;
  email: string;
  status: string;
  postsToday: number;
}

interface AccountDetail {
  dealer: {
    id: string;
    name: string;
    accountType: string;
    plan: string;
    status: string;
    createdAt: string;
    features: Record<string, boolean>;
  };
  reps: Rep[];
  vehicleCount: number;
}

function FeatureFlag({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-sm text-foreground capitalize">
        {name.replace(/([A-Z])/g, " $1").trim()}
      </span>
      <Badge
        variant="outline"
        className={
          enabled
            ? "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
            : "border-muted-foreground/50 text-muted-foreground bg-muted"
        }
      >
        {enabled ? "On" : "Off"}
      </Badge>
    </div>
  );
}

export default function AdminAccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<AccountDetail>({
    queryKey: ["/api/admin/accounts", id],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!id,
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
      <div className="text-center py-12 text-muted-foreground">
        Account not found.
      </div>
    );
  }

  const { dealer, reps, vehicleCount } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/accounts")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{dealer.name}</h1>
          <p className="text-muted-foreground capitalize">
            {dealer.accountType} &middot; {dealer.plan} plan &middot;{" "}
            {dealer.status}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden border-border">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Account Type</p>
                <p className="mt-1 text-lg font-semibold text-foreground capitalize">
                  {dealer.accountType}
                </p>
              </div>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-border">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reps</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {reps.length}
                </p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-border">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vehicles</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {vehicleCount}
                </p>
              </div>
              <Car className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dealer.features &&
              Object.entries(dealer.features).map(([key, val]) => (
                <FeatureFlag key={key} name={key} enabled={val} />
              ))}
            {(!dealer.features ||
              Object.keys(dealer.features).length === 0) && (
              <p className="text-muted-foreground text-sm col-span-full">
                No feature flags configured.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Sales Reps</CardTitle>
        </CardHeader>
        <CardContent>
          {reps.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No reps for this account.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Email</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Posts Today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reps.map((rep) => (
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
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          rep.status === "active"
                            ? "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
                            : "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
                        }
                      >
                        {rep.status
                          ? rep.status.charAt(0).toUpperCase() +
                            rep.status.slice(1)
                          : "Unknown"}
                      </Badge>
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
