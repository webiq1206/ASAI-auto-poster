import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function InviteToken() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [facebookEmail, setFacebookEmail] = useState("");
  const [facebookPassword, setFacebookPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: invite, isLoading, error: fetchError } = useQuery<{
    valid: boolean;
    email: string;
    name: string;
    dealership_name: string;
  }>({
    queryKey: [`/api/invitations/validate/${token}`],
    enabled: !!token,
  });

  useEffect(() => {
    if (invite?.name) setName(invite.name);
  }, [invite?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/invitations/accept", {
        token,
        name,
        password,
        facebook_email: facebookEmail || undefined,
        facebook_password: facebookPassword || undefined,
      });
      const data = await res.json();
      if (data.redirect) setLocation(data.redirect);
    } catch (err: any) {
      setError(err.message?.includes(":") ? err.message.split(":").slice(1).join(":").trim() : err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-qc-bg-primary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-qc-accent-blue" />
      </div>
    );
  }

  if (fetchError || !invite?.valid) {
    return (
      <div className="min-h-screen bg-qc-bg-primary flex items-center justify-center px-4">
        <Card className="bg-qc-bg-card border-qc-border max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-qc-danger mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-qc-text-primary mb-2">
              Invalid Invitation
            </h2>
            <p className="text-qc-text-secondary mb-6">
              This invitation link is invalid, expired, or has already been used.
            </p>
            <a href="/login" className="text-qc-accent-blue hover:text-qc-accent-blue-hover text-sm">
              Go to login
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-qc-bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-qc-accent-blue to-qc-accent-purple bg-clip-text text-transparent">
            Quantum Connect AI
          </h1>
          <p className="mt-2 text-qc-text-secondary">
            Join <span className="text-qc-text-primary font-medium">{invite.dealership_name}</span>
          </p>
        </div>

        <Card className="bg-qc-bg-card border-qc-border">
          <CardHeader>
            <CardTitle className="text-qc-text-primary text-lg">
              Accept your invitation
            </CardTitle>
            <p className="text-sm text-qc-text-muted">
              Invited as: {invite.email}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-qc-text-secondary">Your Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-qc-bg-elevated border-qc-border text-qc-text-primary"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-qc-text-secondary">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
                />
              </div>

              <div className="border-t border-qc-border pt-4 mt-4">
                <h3 className="text-sm font-medium text-qc-text-primary mb-3">
                  Facebook Connection <span className="text-qc-text-muted">(optional, can do later)</span>
                </h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-qc-text-secondary">Facebook Email</Label>
                    <Input
                      type="email"
                      value={facebookEmail}
                      onChange={(e) => setFacebookEmail(e.target.value)}
                      placeholder="your@facebook.com"
                      className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-qc-text-secondary">Facebook Password</Label>
                    <Input
                      type="password"
                      value={facebookPassword}
                      onChange={(e) => setFacebookPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-qc-danger">{error}</p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-qc-accent-blue to-qc-accent-purple hover:from-qc-accent-blue-hover hover:to-qc-accent-purple text-white rounded-qc-sm"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Join Team
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
