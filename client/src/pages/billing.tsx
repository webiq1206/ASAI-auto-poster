import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Image, LayoutGrid, BarChart3 } from "lucide-react";

interface BillingData {
  plan: string;
  stripeStatus: string;
  hasStripeCustomer: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  features: {
    core: boolean;
    customBackgrounds: boolean;
    visualMerchandising: boolean;
    salesDashboard: boolean;
    salesDashboardSetupPaid: boolean;
  };
  activeRepCount: number;
  reps: { id: string; name: string; active: boolean }[];
}

const BILLING_PRICE_IDS: Record<string, string> = {
  customBackgrounds: import.meta.env.VITE_STRIPE_BACKGROUNDS_PRICE_ID ?? "",
  visualMerchandising: import.meta.env.VITE_STRIPE_VISUAL_MERCH_PRICE_ID ?? "",
  salesDashboard: import.meta.env.VITE_STRIPE_DASHBOARD_PRICE_ID ?? "",
};

const VM_PRICE_PER_REP = 79;

export default function Billing() {
  const { isOwnerOrAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: billing, isLoading, error } = useQuery<BillingData>({
    queryKey: ["/api/billing"],
    enabled: isOwnerOrAdmin,
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/portal");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/billing/checkout", { price_id: priceId });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
    },
  });

  useEffect(() => {
    if (!isOwnerOrAdmin) setLocation("/dashboard");
  }, [isOwnerOrAdmin, setLocation]);

  if (!isOwnerOrAdmin) return null;

  if (isLoading) {
    return (
      <div className="min-h-[50vh] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="bg-background p-6">
        <div className="text-destructive">
          {error instanceof Error ? error.message : "Failed to load billing data"}
        </div>
      </div>
    );
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;

  const FeatureCard = ({
    title,
    description,
    active,
    icon: Icon,
    upgradePriceId,
    children,
  }: {
    title: string;
    description: string;
    active: boolean;
    icon: React.ComponentType<{ className?: string }>;
    upgradePriceId?: string;
    children?: React.ReactNode;
  }) => {
    const priceId = upgradePriceId ? BILLING_PRICE_IDS[upgradePriceId] : "";
    const hasGradientBorder = !active && upgradePriceId;
    const isCheckoutPending = checkoutMutation.isPending && checkoutMutation.variables === priceId;

    const cardContent = (
      <>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-lg border border-border p-2">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-foreground text-lg">{title}</CardTitle>
              <CardDescription className="text-muted-foreground">{description}</CardDescription>
            </div>
          </div>
          {active ? (
            <Badge variant="default" className="bg-primary text-primary-foreground">
              Active
            </Badge>
          ) : upgradePriceId ? (
            <Button
              size="sm"
              className="bg-primary text-primary-foreground"
              disabled={!priceId || isCheckoutPending}
              onClick={() => priceId && checkoutMutation.mutate(priceId)}
            >
              {isCheckoutPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Subscribe"
              )}
            </Button>
          ) : null}
        </CardHeader>
        {children && <CardContent className="pt-0">{children}</CardContent>}
      </>
    );

    if (hasGradientBorder) {
      return (
        <div className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 p-[2px]">
          <Card className="rounded-[10px] border-0 bg-background">
            {cardContent}
          </Card>
        </div>
      );
    }

    return (
      <Card className="border-border">
        {cardContent}
      </Card>
    );
  };

  return (
    <div className="bg-background min-h-full">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Billing
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and add-on features
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Current Plan</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {billing.plan} plan
                  {billing.trialActive && billing.trialEndsAt && (
                    <span> · Trial ends {formatDate(billing.trialEndsAt)}</span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {billing.trialActive && (
                  <Badge variant="secondary">Trial</Badge>
                )}
                {billing.stripeStatus && billing.stripeStatus !== "none" && (
                  <Badge variant="outline" className="capitalize">
                    {billing.stripeStatus}
                  </Badge>
                )}
                {billing.hasStripeCustomer && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Manage Billing
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Features</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              title="Core Posting"
              description="Auto-posting to Facebook Marketplace"
              active={billing.features.core}
              icon={CreditCard}
            />

            <FeatureCard
              title="Custom Backgrounds"
              description="Replace and enhance vehicle photo backgrounds"
              active={billing.features.customBackgrounds}
              icon={Image}
              upgradePriceId="customBackgrounds"
            />

            <FeatureCard
              title="Visual Merchandising"
              description="Per-rep pricing for AI background features"
              active={billing.features.visualMerchandising}
              icon={LayoutGrid}
              upgradePriceId="visualMerchandising"
            >
              {billing.features.visualMerchandising && (
                <p className="text-sm text-muted-foreground">
                  Visual Merchandising: {billing.activeRepCount} reps × ${VM_PRICE_PER_REP} = $
                  {billing.activeRepCount * VM_PRICE_PER_REP}/mo
                </p>
              )}
            </FeatureCard>

            <FeatureCard
              title="Sales Dashboard"
              description="Analytics and sales performance insights"
              active={billing.features.salesDashboard}
              icon={BarChart3}
              upgradePriceId="salesDashboard"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
