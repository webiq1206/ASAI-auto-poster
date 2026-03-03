import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, UserPlus, MoreHorizontal, Pause, Play, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeamRep {
  id: string;
  name: string;
  email: string;
  status: string;
  healthScore: number;
  postsToday: number;
  totalPosts: number;
  totalLeads: number;
  facebookEmail: string | null;
  isActive: boolean;
  rampDay: number;
  lastPostAt: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    active: { variant: "outline", className: "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10" },
    warming: { variant: "outline", className: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10" },
    paused: { variant: "outline", className: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10" },
    flagged: { variant: "outline", className: "border-orange-500/50 text-orange-600 dark:text-orange-400 bg-orange-500/10" },
    banned: { variant: "outline", className: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10" },
  };
  const { className } = config[status] ?? { className: "" };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  return <Badge variant="outline" className={className || undefined}>{label}</Badge>;
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
  } else if (score >= 20) {
    label = "Critical";
    className = "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10";
  } else {
    label = "Banned";
    className = "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10";
  }
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

export default function Team() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [removeRep, setRemoveRep] = useState<TeamRep | null>(null);

  const { data: reps, isLoading } = useQuery<TeamRep[]>({
    queryKey: ["/api/team"],
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const res = await apiRequest("POST", "/api/invitations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      toast({ title: "Invitation sent", description: "The sales rep has been invited." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to send invitation",
        description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/team/${id}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({ title: "Posting paused", description: "The rep's posting has been paused." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to pause",
        description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/team/${id}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({ title: "Posting resumed", description: "The rep's posting has been resumed." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to resume",
        description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setRemoveRep(null);
      toast({ title: "Rep removed", description: "The sales rep has been removed from the team." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to remove",
        description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ name: inviteName, email: inviteEmail });
  };

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
        <h1 className="text-2xl font-semibold text-foreground">Team Management</h1>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Sales Rep
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Invite Sales Rep</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Name</Label>
                <Input
                  id="name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  className="bg-background border-border text-foreground"
                  placeholder="Sales rep name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="bg-background border-border text-foreground"
                  placeholder="sales@example.com"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Invitation
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Sales Reps</CardTitle>
        </CardHeader>
        <CardContent>
          {!reps || reps.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No sales reps yet. Invite your first rep to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">FB Connection</TableHead>
                  <TableHead className="text-foreground">Posts Today</TableHead>
                  <TableHead className="text-foreground">Leads</TableHead>
                  <TableHead className="text-foreground">Health Score</TableHead>
                  <TableHead className="text-foreground w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reps.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-foreground">{rep.name}</div>
                        <div className="text-sm text-muted-foreground">{rep.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={rep.status} />
                    </TableCell>
                    <TableCell>
                      {rep.facebookEmail ? (
                        <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10">
                          Connected
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not connected</span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">{rep.postsToday ?? 0}</TableCell>
                    <TableCell className="text-foreground">{rep.totalLeads ?? 0}</TableCell>
                    <TableCell>
                      <HealthBadge score={rep.healthScore ?? 0} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border">
                          <DropdownMenuItem
                            onClick={() => pauseMutation.mutate(rep.id)}
                            disabled={rep.status === "paused" || pauseMutation.isPending}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Posting
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => resumeMutation.mutate(rep.id)}
                            disabled={rep.status === "active" || resumeMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setRemoveRep(rep)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!removeRep} onOpenChange={(open) => !open && setRemoveRep(null)}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remove Sales Rep</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {removeRep
                ? `This will pause all posting from ${removeRep.name}'s Facebook and remove their access.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeRep && removeMutation.mutate(removeRep.id)}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
