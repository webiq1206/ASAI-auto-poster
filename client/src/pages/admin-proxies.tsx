import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Globe, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Proxy {
  id: string;
  host: string;
  port: number;
  protocol: string;
  geo: string;
  assignedRepName: string | null;
  status: string;
}

export default function AdminProxies() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    host: "",
    port: "",
    protocol: "http",
    geo: "",
    username: "",
    password: "",
  });

  const { data: proxies, isLoading } = useQuery<Proxy[]>({
    queryKey: ["/api/admin/proxies"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiRequest("POST", "/api/admin/proxies", {
        ...data,
        port: parseInt(data.port, 10),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proxies"] });
      setAddOpen(false);
      setForm({ host: "", port: "", protocol: "http", geo: "", username: "", password: "" });
      toast({ title: "Added", description: "Proxy added successfully." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to add proxy",
        description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/proxies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proxies"] });
      toast({ title: "Deleted", description: "Proxy removed." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Proxy Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            {proxies?.length ?? 0} proxies configured
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Proxy
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Proxy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Host</Label>
                  <Input
                    value={form.host}
                    onChange={(e) =>
                      setForm({ ...form, host: e.target.value })
                    }
                    placeholder="proxy.example.com"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Port</Label>
                  <Input
                    value={form.port}
                    onChange={(e) =>
                      setForm({ ...form, port: e.target.value })
                    }
                    placeholder="8080"
                    type="number"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Protocol</Label>
                  <Select
                    value={form.protocol}
                    onValueChange={(v) =>
                      setForm({ ...form, protocol: v })
                    }
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Geo / Location</Label>
                  <Input
                    value={form.geo}
                    onChange={(e) =>
                      setForm({ ...form, geo: e.target.value })
                    }
                    placeholder="US-TX"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Username</Label>
                  <Input
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    placeholder="Optional"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Optional"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!form.host || !form.port || addMutation.isPending}
                  onClick={() => addMutation.mutate(form)}
                >
                  {addMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Add Proxy
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="h-5 w-5" />
            Proxies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!proxies || proxies.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No proxies configured yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Host:Port</TableHead>
                  <TableHead className="text-foreground">Protocol</TableHead>
                  <TableHead className="text-foreground">Geo</TableHead>
                  <TableHead className="text-foreground">
                    Assigned Rep
                  </TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground w-[80px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxies.map((proxy) => (
                  <TableRow key={proxy.id}>
                    <TableCell className="font-mono text-foreground">
                      {proxy.host}:{proxy.port}
                    </TableCell>
                    <TableCell className="text-muted-foreground uppercase">
                      {proxy.protocol}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {proxy.geo || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {proxy.assignedRepName ?? "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          proxy.status === "active"
                            ? "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
                            : proxy.status === "error"
                              ? "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10"
                              : "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
                        }
                      >
                        {proxy.status?.charAt(0).toUpperCase() +
                          proxy.status?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(proxy.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
