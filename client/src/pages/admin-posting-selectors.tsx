import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2, Plus, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SelectorConfig {
  id: string;
  name: string;
  config: string;
  updatedAt: string;
}

export default function AdminPostingSelectors() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingJson, setEditingJson] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newConfig, setNewConfig] = useState("{}");

  const { data: selectors, isLoading } = useQuery<SelectorConfig[]>({
    queryKey: ["/api/admin/selectors"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: string }) => {
      JSON.parse(config);
      await apiRequest("PUT", `/api/admin/selectors/${id}`, { config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/selectors"] });
      setEditingId(null);
      toast({ title: "Saved", description: "Selector config updated." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.message?.includes("JSON")
          ? "Invalid JSON"
          : err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; config: string }) => {
      JSON.parse(data.config);
      await apiRequest("POST", "/api/admin/selectors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/selectors"] });
      setNewOpen(false);
      setNewName("");
      setNewConfig("{}");
      toast({ title: "Created", description: "New selector config created." });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Create failed",
        description: err.message?.includes("JSON")
          ? "Invalid JSON"
          : err.message?.replace(/^\d+:\s*/, "") || "Something went wrong",
      });
    },
  });

  const handleEdit = (selector: SelectorConfig) => {
    setEditingId(selector.id);
    try {
      setEditingJson(JSON.stringify(JSON.parse(selector.config), null, 2));
    } catch {
      setEditingJson(selector.config);
    }
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Selector Configs
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage CSS/XPath selectors for Facebook automation
          </p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Config
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                New Selector Config
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. marketplace-v2"
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Config JSON</Label>
                <Textarea
                  value={newConfig}
                  onChange={(e) => setNewConfig(e.target.value)}
                  rows={10}
                  className="bg-background border-border text-foreground font-mono text-sm"
                  placeholder='{ "selectors": {} }'
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setNewOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    createMutation.mutate({ name: newName, config: newConfig })
                  }
                  disabled={!newName || createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!selectors || selectors.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            No selector configs yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {selectors.map((selector) => (
            <Card key={selector.id} className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Settings2 className="h-5 w-5" />
                    {selector.name}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    Updated{" "}
                    {new Date(selector.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingId === selector.id ? (
                  <>
                    <Textarea
                      value={editingJson}
                      onChange={(e) => setEditingJson(e.target.value)}
                      rows={12}
                      className="bg-background border-border text-foreground font-mono text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            id: selector.id,
                            config: editingJson,
                          })
                        }
                      >
                        {updateMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <pre className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-foreground font-mono overflow-x-auto max-h-48 overflow-y-auto">
                      {(() => {
                        try {
                          return JSON.stringify(
                            JSON.parse(selector.config),
                            null,
                            2,
                          );
                        } catch {
                          return selector.config;
                        }
                      })()}
                    </pre>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(selector)}
                      >
                        Edit
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
