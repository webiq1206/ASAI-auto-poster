import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Globe, Users, Trash2, Settings2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FacebookGroup {
  id: string;
  name: string;
  url: string;
  maxPostsPerDay: number;
  repName: string;
  postsToday: number;
  isActive: boolean;
}

interface TeamRep {
  id: string;
  name: string;
}

export default function PostingGroups() {
  const { isOwnerOrAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [addRepId, setAddRepId] = useState<string>("none");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery<FacebookGroup[]>({
    queryKey: ["/api/groups"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: reps = [] } = useQuery<TeamRep[]>({
    queryKey: ["/api/team"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOwnerOrAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      group_name: string;
      group_url: string;
      rep_id?: string;
      max_posts_per_day?: number;
    }) => {
      await apiRequest("POST", "/api/groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setAddOpen(false);
      setAddRepId("none");
      toast({ title: "Group added", description: "The Facebook group has been added." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to add group",
        description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      posting_enabled,
      max_posts_per_day,
    }: {
      id: string;
      posting_enabled?: boolean;
      max_posts_per_day?: number;
    }) => {
      await apiRequest("PUT", `/api/groups/${id}`, {
        ...(posting_enabled !== undefined && { posting_enabled }),
        ...(max_posts_per_day !== undefined && { max_posts_per_day }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Updated", description: "Group settings updated." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setDeleteId(null);
      toast({ title: "Group removed", description: "The group has been deactivated." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const group_name = fd.get("name") as string;
    const group_url = fd.get("url") as string;
    const maxStr = fd.get("maxPostsPerDay");
    const max_posts_per_day = maxStr ? parseInt(String(maxStr), 10) : 3;
    createMutation.mutate({
      group_name,
      group_url,
      max_posts_per_day,
      ...(addRepId && addRepId !== "none" && { rep_id: addRepId }),
    });
  };

  const handleToggle = (group: FacebookGroup) => {
    if (!isOwnerOrAdmin) return;
    updateMutation.mutate({ id: group.id, posting_enabled: !group.isActive });
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) deleteMutation.mutate(deleteId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Facebook Groups</h1>
          <p className="text-sm text-muted-foreground">
            Manage groups for cross-posting vehicles
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isOwnerOrAdmin}>
              <Plus className="h-4 w-4 mr-1" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Facebook Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input name="name" placeholder="Cars for Sale - Local Area" required />
              </div>
              <div className="space-y-2">
                <Label>Group URL</Label>
                <Input
                  name="url"
                  type="url"
                  placeholder="https://www.facebook.com/groups/..."
                  required
                />
              </div>
              {isOwnerOrAdmin && reps.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Rep (optional)</Label>
                  <Select value={addRepId} onValueChange={setAddRepId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No rep assigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No rep assigned</SelectItem>
                      {reps.map((rep) => (
                        <SelectItem key={rep.id} value={rep.id}>
                          {rep.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Max Posts Per Day</Label>
                <Input
                  name="maxPostsPerDay"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={3}
                />
                <p className="text-xs text-muted-foreground">
                  Limit posts to avoid being flagged by Facebook
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Group
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Active Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Globe className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No groups configured yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add Facebook groups to enable cross-posting beyond Marketplace
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  {isOwnerOrAdmin && <TableHead>Rep</TableHead>}
                  <TableHead>Posts Today</TableHead>
                  <TableHead>Daily Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{group.name}</p>
                        <a
                          href={group.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {group.url}
                        </a>
                      </div>
                    </TableCell>
                    {isOwnerOrAdmin && (
                      <TableCell className="text-muted-foreground">
                        {group.repName}
                      </TableCell>
                    )}
                    <TableCell className="text-foreground">
                      {group.postsToday}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {group.maxPostsPerDay}
                    </TableCell>
                    <TableCell>
                      {isOwnerOrAdmin ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={group.isActive}
                            onCheckedChange={() => handleToggle(group)}
                            disabled={updateMutation.isPending}
                          />
                          <Badge
                            variant="outline"
                            className={
                              group.isActive
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                            }
                          >
                            {group.isActive ? "Active" : "Paused"}
                          </Badge>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className={
                            group.isActive
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }
                        >
                          {group.isActive ? "Active" : "Paused"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isOwnerOrAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(group.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the group. You can add it again later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Settings2 className="h-5 w-5" />
            Cross-Posting Configuration
          </CardTitle>
          <CardDescription>
            Rules for distributing vehicles across groups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Max Group Posts Per Rep Per Day</p>
                <p className="text-xs text-muted-foreground">Limits total group posts across all groups</p>
              </div>
              <Badge variant="outline">3 posts/day</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Delay After Marketplace Post</p>
                <p className="text-xs text-muted-foreground">Wait time before cross-posting to a group</p>
              </div>
              <Badge variant="outline">30 min</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Min Hours Between Group Posts</p>
                <p className="text-xs text-muted-foreground">Per-group cooldown between posts</p>
              </div>
              <Badge variant="outline">4 hours</Badge>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Vehicle Distribution</p>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Mode</p>
              <Badge variant="secondary">Round Robin</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Vehicles are distributed evenly across active groups, rotating to ensure no single group gets the same vehicle twice within the repost window.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            These defaults are enforced by the posting scheduler. Per-group limits can be set in the group table above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
