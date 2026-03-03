import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type ConnectionStatus = "disconnected" | "connecting" | "verifying" | "connected" | "failed" | "checkpoint" | "requires_2fa";

interface FacebookConnectionProps {
  repId?: string;
  currentStatus?: string;
  currentEmail?: string;
  onConnected?: () => void;
}

export function FacebookConnection({ repId, currentStatus, currentEmail, onConnected }: FacebookConnectionProps) {
  const [status, setStatus] = useState<ConnectionStatus>(
    currentStatus === "active" || currentStatus === "warming" ? "connected" : "disconnected"
  );
  const [email, setEmail] = useState(currentEmail || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("connecting");

    try {
      const res = await apiRequest("POST", "/api/facebook/connect", {
        rep_id: repId,
        facebook_email: email,
        facebook_password: password,
      });
      const data = await res.json();
      setStatus("verifying");
      setPassword("");

      // Poll for connection status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/facebook/status${repId ? `?rep_id=${repId}` : ""}`, {
            credentials: "include",
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === "connected" || statusData.status === "warming" || statusData.status === "active") {
              setStatus("connected");
              clearInterval(pollInterval);
              onConnected?.();
            } else if (statusData.status === "failed") {
              setStatus("failed");
              setError(statusData.error || "Connection failed");
              clearInterval(pollInterval);
            } else if (statusData.status === "checkpoint") {
              setStatus("checkpoint");
              clearInterval(pollInterval);
            } else if (statusData.status === "requires_2fa") {
              setStatus("requires_2fa");
              clearInterval(pollInterval);
            }
          }
        } catch {
          // Keep polling
        }
      }, 3000);

      // Stop polling after 60 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        if (status === "verifying") {
          setStatus("verifying");
        }
      }, 60000);
    } catch (err: any) {
      setStatus("failed");
      setError(err.message || "Failed to connect");
    }
  };

  const statusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-qc-success/10 text-qc-success border-qc-success/20">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
          </Badge>
        );
      case "connecting":
      case "verifying":
        return (
          <Badge className="bg-qc-accent-blue/10 text-qc-accent-blue border-qc-accent-blue/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {status === "connecting" ? "Connecting..." : "Verifying..."}
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-qc-danger/10 text-qc-danger border-qc-danger/20">
            <XCircle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        );
      case "checkpoint":
        return (
          <Badge className="bg-qc-warning/10 text-qc-warning border-qc-warning/20">
            <AlertTriangle className="h-3 w-3 mr-1" /> Checkpoint Required
          </Badge>
        );
      case "requires_2fa":
        return (
          <Badge className="bg-qc-warning/10 text-qc-warning border-qc-warning/20">
            <AlertTriangle className="h-3 w-3 mr-1" /> 2FA Required
          </Badge>
        );
      default:
        return (
          <Badge className="bg-qc-text-muted/10 text-qc-text-muted border-qc-text-muted/20">
            Not Connected
          </Badge>
        );
    }
  };

  if (status === "connected") {
    return (
      <Card className="bg-qc-bg-card border-qc-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium text-qc-text-primary">
            Facebook Connection
          </CardTitle>
          {statusBadge()}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-qc-text-secondary">
            Connected as <span className="text-qc-text-primary">{email || currentEmail}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-qc-border text-qc-text-secondary hover:text-qc-text-primary"
            onClick={() => setStatus("disconnected")}
          >
            Reconnect
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "checkpoint") {
    return (
      <Card className="bg-qc-bg-card border-qc-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium text-qc-text-primary">
            Facebook Connection
          </CardTitle>
          {statusBadge()}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-qc-warning mb-3">
            Facebook requires verification. Please resolve the checkpoint on your phone, then click Retry.
          </p>
          <Button
            size="sm"
            className="bg-qc-accent-blue hover:bg-qc-accent-blue-hover text-white"
            onClick={() => setStatus("disconnected")}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-qc-bg-card border-qc-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-qc-text-primary">
          Facebook Connection
        </CardTitle>
        {statusBadge()}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleConnect} className="space-y-3">
          <div className="space-y-2">
            <Label className="text-qc-text-secondary text-xs">Facebook Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
              placeholder="your@facebook.com"
              disabled={status === "connecting" || status === "verifying"}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-qc-text-secondary text-xs">Facebook Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
              placeholder="••••••••"
              disabled={status === "connecting" || status === "verifying"}
            />
          </div>
          {error && <p className="text-xs text-qc-danger">{error}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={status === "connecting" || status === "verifying"}
            className="bg-qc-accent-blue hover:bg-qc-accent-blue-hover text-white"
          >
            {(status === "connecting" || status === "verifying") && (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            )}
            Connect Facebook
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
