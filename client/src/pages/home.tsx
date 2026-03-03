import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Car, Send, MessageSquare, Shield, BarChart3, Zap,
  ChevronRight, ArrowRight,
} from "lucide-react";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-home">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border max-w-7xl mx-auto">
        <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Quantum Connect AI
        </span>
        <div className="flex items-center gap-4">
          <a href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </a>
          <Button
            onClick={() => setLocation("/signup")}
            className="bg-primary text-primary-foreground rounded-lg"
            size="sm"
          >
            Get Started <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-8">
          <Zap className="h-3 w-3" /> AI-Powered Automotive Sales
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
          Automate Your{" "}
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Facebook Marketplace
          </span>{" "}
          Listings
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Quantum Connect AI posts your inventory, engages leads with AI, and manages
          your entire sales pipeline - all on autopilot.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setLocation("/signup")}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 h-auto text-base rounded-lg"
          >
            Start Free Trial <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/login")}
            className="border-border text-foreground px-8 py-3 h-auto text-base rounded-lg"
          >
            Sign In
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything You Need to Sell More Cars
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From automated posting to AI-powered lead engagement, Quantum Connect handles it all.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={Send}
            title="Automated Posting"
            description="Post up to 10 vehicles per day per rep to Facebook Marketplace with AI-generated listings that never repeat."
          />
          <FeatureCard
            icon={Car}
            title="DMS Integration"
            description="Sync your inventory automatically from HomeNet, DealerCenter, or CSV feeds every 2 hours."
          />
          <FeatureCard
            icon={MessageSquare}
            title="AI Lead Engagement"
            description="AI chatbot responds to Messenger inquiries instantly, qualifies leads, and routes them to the right rep."
          />
          <FeatureCard
            icon={Shield}
            title="Anti-Detection"
            description="Human-like posting behavior with warm-up routines, random timing, and unique fingerprints per rep."
          />
          <FeatureCard
            icon={BarChart3}
            title="Sales Dashboard"
            description="Real-time analytics, lead scoring, CRM integration via GoHighLevel, and performance tracking."
          />
          <FeatureCard
            icon={Zap}
            title="Photo Processing"
            description="AI background removal, license plate blurring, and professional studio-style vehicle photos."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Quantum Connect AI. All rights reserved.
          </span>
          <span className="text-xs text-muted-foreground">
            automotivesales.ai
          </span>
        </div>
      </footer>
    </div>
  );
}
