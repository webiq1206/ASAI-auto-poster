import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { login, isLoginPending, loginError, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      setLocation("/dashboard");
    } catch {}
  };

  return (
    <div className="min-h-screen bg-qc-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-qc-accent-blue to-qc-accent-purple bg-clip-text text-transparent">
            Quantum Connect AI
          </h1>
          <p className="mt-2 text-qc-text-secondary">
            Sign in to your account
          </p>
        </div>

        <Card className="bg-qc-bg-card border-qc-border">
          <CardHeader>
            <CardTitle className="text-qc-text-primary text-lg">
              Welcome back
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-qc-text-secondary">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-qc-text-secondary">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
                />
              </div>

              {loginError && (
                <p className="text-sm text-qc-danger">
                  {loginError.message.includes(":")
                    ? loginError.message.split(":").slice(1).join(":").trim()
                    : loginError.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoginPending}
                className="w-full bg-gradient-to-r from-qc-accent-blue to-qc-accent-purple hover:from-qc-accent-blue-hover hover:to-qc-accent-purple text-white rounded-qc-sm"
              >
                {isLoginPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-qc-text-muted">
                Don't have an account?{" "}
                <a
                  href="/signup"
                  className="text-qc-accent-blue hover:text-qc-accent-blue-hover"
                >
                  Get started
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
