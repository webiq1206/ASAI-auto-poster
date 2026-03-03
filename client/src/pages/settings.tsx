import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FacebookConnection } from "@/components/facebook-connection";
import {
  Building2,
  User,
  Bell,
  Link2,
  Loader2,
  Save,
  Shield,
} from "lucide-react";

interface DealerSettings {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  timezone: string;
  dmsFeedUrl: string;
  ghlWebhookUrl: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyLeads: boolean;
  notifyPostingErrors: boolean;
}

interface ProfileSettings {
  name: string;
  email: string;
}

const DEFAULT_DEALER: DealerSettings = {
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  timezone: "America/New_York",
  dmsFeedUrl: "",
  ghlWebhookUrl: "",
  notifyEmail: true,
  notifySms: false,
  notifyLeads: true,
  notifyPostingErrors: true,
};

export default function Settings() {
  const { user, isOwnerOrAdmin, isRep, isIndividual } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dealer, setDealer] = useState<DealerSettings>(DEFAULT_DEALER);
  const [profile, setProfile] = useState<ProfileSettings>({ name: "", email: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const settingsQuery = useQuery<Partial<DealerSettings & ProfileSettings>>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (res.status === 404 || res.status === 401) return {};
      if (!res.ok) return {};
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      const d = settingsQuery.data;
      setDealer((prev) => ({
        ...prev,
        name: d.name ?? user?.dealer?.name ?? "",
        phone: d.phone ?? "",
        address: d.address ?? "",
        city: d.city ?? "",
        state: d.state ?? "",
        zip: d.zip ?? "",
        timezone: d.timezone ?? "America/New_York",
        dmsFeedUrl: d.dmsFeedUrl ?? "",
        ghlWebhookUrl: d.ghlWebhookUrl ?? "",
        notifyEmail: d.notifyEmail ?? true,
        notifySms: d.notifySms ?? false,
        notifyLeads: d.notifyLeads ?? true,
        notifyPostingErrors: d.notifyPostingErrors ?? true,
      }));
    }
    if (user?.user) {
      setProfile({ name: user.user.name ?? "", email: user.user.email ?? "" });
    }
  }, [settingsQuery.data, user]);

  const saveDealerMutation = useMutation({
    mutationFn: async (data: DealerSettings) => {
      try {
        await apiRequest("PUT", "/api/settings", data);
      } catch (err: any) {
        if (err.message?.startsWith("404")) return;
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to save settings",
        description: err.message?.replace(/^\d+:\s*/, ""),
      });
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; currentPassword?: string; newPassword?: string }) => {
      try {
        await apiRequest("PUT", "/api/settings", { profile: data });
      } catch (err: any) {
        if (err.message?.startsWith("404")) return;
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Profile updated" });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: err.message?.replace(/^\d+:\s*/, ""),
      });
    },
  });

  const showDealerSettings = isOwnerOrAdmin || isIndividual;
  const showFacebookConnection = isRep || isIndividual;
  const showProfileSettings = true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {showProfileSettings && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your personal account information</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveProfileMutation.mutate({
                  name: profile.name,
                  email: profile.email,
                  ...(newPassword ? { currentPassword, newPassword } : {}),
                });
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Change Password
                </Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saveProfileMutation.isPending}>
                  {saveProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showFacebookConnection && (
        <FacebookConnection
          repId={user?.rep_id}
        />
      )}

      {showDealerSettings && (
        <>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5" />
                {isIndividual ? "Account Information" : "Dealership Information"}
              </CardTitle>
              <CardDescription>
                {isIndividual
                  ? "Your business details"
                  : "Your dealership details and contact info"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveDealerMutation.mutate(dealer);
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{isIndividual ? "Business Name" : "Dealership Name"}</Label>
                    <Input
                      value={dealer.name}
                      onChange={(e) =>
                        setDealer((d) => ({ ...d, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={dealer.phone}
                      onChange={(e) =>
                        setDealer((d) => ({ ...d, phone: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={dealer.address}
                    onChange={(e) =>
                      setDealer((d) => ({ ...d, address: e.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={dealer.city}
                      onChange={(e) =>
                        setDealer((d) => ({ ...d, city: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={dealer.state}
                      onChange={(e) =>
                        setDealer((d) => ({ ...d, state: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input
                      value={dealer.zip}
                      onChange={(e) =>
                        setDealer((d) => ({ ...d, zip: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={dealer.timezone}
                    onValueChange={(val) =>
                      setDealer((d) => ({ ...d, timezone: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saveDealerMutation.isPending}>
                    {saveDealerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save {isIndividual ? "Account" : "Dealership"} Info
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Link2 className="h-5 w-5" />
                Integrations
              </CardTitle>
              <CardDescription>
                Connect external services and data feeds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>DMS Feed URL</Label>
                <Input
                  placeholder="https://your-dms.com/api/feed"
                  value={dealer.dmsFeedUrl}
                  onChange={(e) =>
                    setDealer((d) => ({ ...d, dmsFeedUrl: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  URL for automatic inventory sync from your DMS provider
                </p>
              </div>
              <div className="space-y-2">
                <Label>GHL Webhook URL</Label>
                <Input
                  placeholder="https://services.leadconnectorhq.com/hooks/..."
                  value={dealer.ghlWebhookUrl}
                  onChange={(e) =>
                    setDealer((d) => ({ ...d, ghlWebhookUrl: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  GoHighLevel webhook for lead forwarding
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => saveDealerMutation.mutate(dealer)}
                  disabled={saveDealerMutation.isPending}
                >
                  {saveDealerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save Integrations
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "notifyEmail" as const, label: "Email notifications", desc: "Receive updates via email" },
                { key: "notifySms" as const, label: "SMS notifications", desc: "Receive updates via text message" },
                { key: "notifyLeads" as const, label: "New lead alerts", desc: "Get notified when new leads come in" },
                {
                  key: "notifyPostingErrors" as const,
                  label: "Posting error alerts",
                  desc: "Get notified when a post fails",
                },
              ].map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Button
                    variant={dealer[key] ? "default" : "outline"}
                    size="sm"
                    className="h-7 w-14 text-xs"
                    onClick={() =>
                      setDealer((d) => ({ ...d, [key]: !d[key] }))
                    }
                  >
                    {dealer[key] ? "ON" : "OFF"}
                  </Button>
                </div>
              ))}
              <div className="flex justify-end">
                <Button
                  onClick={() => saveDealerMutation.mutate(dealer)}
                  disabled={saveDealerMutation.isPending}
                >
                  {saveDealerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
