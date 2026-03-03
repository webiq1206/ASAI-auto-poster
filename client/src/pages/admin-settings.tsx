import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Shield,
  Camera,
  Bell,
  Send,
  Settings,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminSettingsData {
  adspower: { apiUrl: string; configured: boolean };
  proxy: { provider: string; defaultProtocol: string; defaultGeo: string };
  posting: { maxPostsPerRepPerDay: number; maxPostsPerAccountPerDay: number; minDelayBetweenPosts: number; warmupDays: number };
  photos: { maxWidth: number; jpegQuality: number; bgRemovalProvider: string; concurrency: number };
  alerts: { email: string; slackWebhook: string; smsPhone: string };
}

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground text-base">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-background border-border text-foreground"
      />
    </div>
  );
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<AdminSettingsData>({
    queryKey: ["/api/admin/settings"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [form, setForm] = useState({
    postingMaxPerRep: "",
    postingMaxPerAccount: "",
    postingMinDelay: "",
    postingWarmupDays: "",
    alertEmail: "",
    photoMaxWidth: "",
    photoQuality: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        postingMaxPerRep: String(settings.posting.maxPostsPerRepPerDay),
        postingMaxPerAccount: String(settings.posting.maxPostsPerAccountPerDay),
        postingMinDelay: String(settings.posting.minDelayBetweenPosts),
        postingWarmupDays: String(settings.posting.warmupDays),
        alertEmail: settings.alerts.email,
        photoMaxWidth: String(settings.photos.maxWidth),
        photoQuality: String(settings.photos.jpegQuality),
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/settings", {
        posting: {
          maxPostsPerRepPerDay: parseInt(form.postingMaxPerRep) || 25,
          maxPostsPerAccountPerDay: parseInt(form.postingMaxPerAccount) || 100,
          minDelayBetweenPosts: parseInt(form.postingMinDelay) || 120,
          warmupDays: parseInt(form.postingWarmupDays) || 7,
        },
        alerts: { email: form.alertEmail },
        photos: {
          maxWidth: parseInt(form.photoMaxWidth) || 1920,
          jpegQuality: parseInt(form.photoQuality) || 85,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Saved", description: "Admin settings updated." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed", description: err.message?.replace(/^\d+:\s*/, "") || "Something went wrong" });
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Global configuration for the Quantum Connect AI platform
        </p>
      </div>

      <div className="space-y-4">
        <SettingsSection title="AdsPower Configuration" icon={Globe}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-foreground">API URL</Label>
              <Input value={settings?.adspower.apiUrl || "Not configured"} disabled className="bg-muted border-border text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Input value={settings?.adspower.configured ? "Configured" : "Not configured"} disabled className="bg-muted border-border text-muted-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">AdsPower settings are configured via environment variables on the VPS.</p>
        </SettingsSection>

        <SettingsSection title="Proxy Provider" icon={Shield}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-foreground">Provider</Label>
              <Input value={settings?.proxy.provider || "Not set"} disabled className="bg-muted border-border text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Default Protocol</Label>
              <Input value={settings?.proxy.defaultProtocol || "http"} disabled className="bg-muted border-border text-muted-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Proxy credentials are configured via environment variables. Manage proxies in the Proxies page.</p>
        </SettingsSection>

        <SettingsSection title="Default Posting Limits" icon={Send}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Max Posts Per Rep/Day" value={form.postingMaxPerRep} onChange={(v) => setForm({ ...form, postingMaxPerRep: v })} type="number" placeholder="25" />
            <Field label="Max Posts Per Account/Day" value={form.postingMaxPerAccount} onChange={(v) => setForm({ ...form, postingMaxPerAccount: v })} type="number" placeholder="100" />
            <Field label="Min Delay Between Posts (sec)" value={form.postingMinDelay} onChange={(v) => setForm({ ...form, postingMinDelay: v })} type="number" placeholder="120" />
            <Field label="Warm-up Duration (days)" value={form.postingWarmupDays} onChange={(v) => setForm({ ...form, postingWarmupDays: v })} type="number" placeholder="7" />
          </div>
        </SettingsSection>

        <SettingsSection title="Photo Processing Defaults" icon={Camera}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Max Photo Width (px)" value={form.photoMaxWidth} onChange={(v) => setForm({ ...form, photoMaxWidth: v })} type="number" placeholder="1920" />
            <Field label="JPEG Quality" value={form.photoQuality} onChange={(v) => setForm({ ...form, photoQuality: v })} type="number" placeholder="85" />
            <div className="space-y-2">
              <Label className="text-foreground">Background Removal</Label>
              <Input value={settings?.photos.bgRemovalProvider || "BRIA RMBG-2.0 (ONNX)"} disabled className="bg-muted border-border text-muted-foreground" />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Alert Recipients" icon={Bell}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Alert Email" value={form.alertEmail} onChange={(v) => setForm({ ...form, alertEmail: v })} placeholder="admin@example.com" />
            <div className="space-y-2">
              <Label className="text-foreground">Slack Webhook</Label>
              <Input value={settings?.alerts.slackWebhook || "Not configured"} disabled className="bg-muted border-border text-muted-foreground" />
            </div>
          </div>
        </SettingsSection>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <Settings className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
