import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, User } from "lucide-react";

type AccountType = "dealership" | "individual";

export default function Signup() {
  const { signup, isSignupPending, signupError, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [accountType, setAccountType] = useState<AccountType>("dealership");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup({
        account_type: accountType,
        name,
        email,
        password,
        phone: phone || undefined,
        city: city || undefined,
        state: state || undefined,
        zip: zip || undefined,
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-qc-bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-qc-accent-blue to-qc-accent-purple bg-clip-text text-transparent">
            Quantum Connect AI
          </h1>
          <p className="mt-2 text-qc-text-secondary">Create your account</p>
        </div>

        <Card className="bg-qc-bg-card border-qc-border">
          <CardHeader>
            <CardTitle className="text-qc-text-primary text-lg">
              Choose your account type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setAccountType("dealership")}
                className={`flex flex-col items-center gap-2 p-4 rounded-qc-md border transition-colors ${
                  accountType === "dealership"
                    ? "border-qc-accent-blue bg-qc-accent-blue/10"
                    : "border-qc-border bg-qc-bg-elevated hover:border-qc-border-active"
                }`}
              >
                <Building2
                  className={`h-6 w-6 ${
                    accountType === "dealership"
                      ? "text-qc-accent-blue"
                      : "text-qc-text-muted"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    accountType === "dealership"
                      ? "text-qc-accent-blue"
                      : "text-qc-text-secondary"
                  }`}
                >
                  Dealership
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType("individual")}
                className={`flex flex-col items-center gap-2 p-4 rounded-qc-md border transition-colors ${
                  accountType === "individual"
                    ? "border-qc-accent-blue bg-qc-accent-blue/10"
                    : "border-qc-border bg-qc-bg-elevated hover:border-qc-border-active"
                }`}
              >
                <User
                  className={`h-6 w-6 ${
                    accountType === "individual"
                      ? "text-qc-accent-blue"
                      : "text-qc-text-muted"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    accountType === "individual"
                      ? "text-qc-accent-blue"
                      : "text-qc-text-secondary"
                  }`}
                >
                  Individual
                </span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-qc-text-secondary">
                  {accountType === "dealership"
                    ? "Dealership Name"
                    : "Your Name"}
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    accountType === "dealership"
                      ? "ABC Motors"
                      : "John Smith"
                  }
                  required
                  className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
                />
              </div>

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
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-qc-text-secondary">
                  Phone{" "}
                  <span className="text-qc-text-muted">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="bg-qc-bg-elevated border-qc-border text-qc-text-primary placeholder:text-qc-text-muted"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-qc-text-secondary">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-qc-bg-elevated border-qc-border text-qc-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-qc-text-secondary">
                    State
                  </Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="bg-qc-bg-elevated border-qc-border text-qc-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip" className="text-qc-text-secondary">
                    ZIP
                  </Label>
                  <Input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="bg-qc-bg-elevated border-qc-border text-qc-text-primary"
                  />
                </div>
              </div>

              {signupError && (
                <p className="text-sm text-qc-danger">
                  {signupError.message.includes(":")
                    ? signupError.message.split(":").slice(1).join(":").trim()
                    : signupError.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={isSignupPending}
                className="w-full bg-gradient-to-r from-qc-accent-blue to-qc-accent-purple hover:from-qc-accent-blue-hover hover:to-qc-accent-purple text-white rounded-qc-sm"
              >
                {isSignupPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-qc-text-muted">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="text-qc-accent-blue hover:text-qc-accent-blue-hover"
                >
                  Sign in
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
