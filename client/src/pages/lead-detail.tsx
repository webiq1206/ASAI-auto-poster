import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  Car,
  MessageSquare,
  Send,
  StickyNote,
  User,
} from "lucide-react";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  channel: string | null;
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicleInterest: string | null;
  score: "cold" | "warm" | "qualified" | null;
  status: string;
  source: string | null;
  notes: string | null;
  repName: string | null;
  createdAt: string;
}

interface LeadDetailResponse {
  lead: Lead;
  messages: Message[];
}

const SCORE_BADGE: Record<string, { className: string; label: string }> = {
  cold: { className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", label: "Cold" },
  warm: { className: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Warm" },
  qualified: { className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Qualified" },
};

const STATUS_OPTIONS = ["new", "contacted", "engaged", "converted", "lost"];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const { data, isLoading, error } = useQuery<LeadDetailResponse>({
    queryKey: ["/api/leads", id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PUT", `/api/leads/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: err.message?.replace(/^\d+:\s*/, ""),
      });
    },
  });

  const noteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      await apiRequest("PUT", `/api/leads/${id}`, { notes: noteText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", id] });
      setNote("");
      toast({ title: "Note saved" });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to save note",
        description: err.message?.replace(/^\d+:\s*/, ""),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Lead not found."}
        </p>
      </div>
    );
  }

  const { lead, messages } = data;
  const scoreCfg = lead.score ? SCORE_BADGE[lead.score] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/leads")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{lead.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            {scoreCfg && (
              <Badge variant="outline" className={scoreCfg.className}>
                {scoreCfg.label}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {lead.source ? `via ${lead.source}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Lead Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-sm text-foreground hover:underline"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm text-foreground hover:underline"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.vehicleInterest && (
                <div className="flex items-center gap-3">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {lead.vehicleInterest}
                  </span>
                </div>
              )}
              {lead.repName && (
                <div className="text-sm text-muted-foreground">
                  Assigned to: <span className="text-foreground">{lead.repName}</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Created:{" "}
                {new Date(lead.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={lead.status || "new"}
                onValueChange={(val) => statusMutation.mutate(val)}
                disabled={statusMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-sm flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.notes && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-lg border border-border p-3">
                  {lead.notes}
                </p>
              )}
              <Textarea
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (note.trim()) {
                    const combined = lead.notes
                      ? `${lead.notes}\n\n---\n${new Date().toLocaleDateString()}: ${note.trim()}`
                      : note.trim();
                    noteMutation.mutate(combined);
                  }
                }}
                disabled={!note.trim() || noteMutation.isPending}
              >
                {noteMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <StickyNote className="h-3 w-3 mr-1" />
                )}
                Save Note
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-border h-full">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Messages from Facebook and SMS will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {messages.map((msg) => {
                    const isInbound = msg.direction === "inbound";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isInbound
                              ? "bg-muted text-foreground rounded-bl-md"
                              : "bg-blue-600 text-white rounded-br-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isInbound ? "text-muted-foreground" : "text-blue-200"
                            }`}
                          >
                            <span className="text-xs">
                              {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                            {msg.channel && (
                              <span className="text-xs">· {msg.channel}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
