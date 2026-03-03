import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, Car, Send, Image, MessageSquare, Users,
  CreditCard, Settings, Building2, Globe, Activity,
  AlertTriangle, ChevronLeft, ChevronRight, LogOut, Clock, Users2,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getCustomerNavItems(
  role: string,
  accountType: string,
): NavItem[] {
  const base: NavItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: role === "rep" ? "My Vehicles" : "Inventory", path: "/inventory", icon: Car },
    { label: role === "rep" ? "My Posts" : "Posting", path: "/posting", icon: Send },
    { label: "Schedule", path: "/posting/schedule", icon: Clock },
    { label: "Groups", path: "/posting/groups", icon: Users2 },
  ];

  if (role !== "rep") {
    base.push({ label: "Photos", path: "/photos", icon: Image });
  }

  base.push({ label: role === "rep" ? "My Leads" : "Leads", path: "/leads", icon: MessageSquare });

  if ((role === "owner" || role === "admin") && accountType === "dealership") {
    base.push({ label: "Team", path: "/team", icon: Users });
  }

  if (role === "owner" || role === "admin") {
    base.push({ label: "Billing", path: "/billing", icon: CreditCard });
  }

  base.push({ label: "Settings", path: "/settings", icon: Settings });

  return base;
}

function getAdminNavItems(): NavItem[] {
  return [
    { label: "Overview", path: "/admin", icon: LayoutDashboard },
    { label: "Accounts", path: "/admin/accounts", icon: Building2 },
    { label: "Reps", path: "/admin/reps", icon: Users },
    { label: "Posting", path: "/admin/posting", icon: Send },
    { label: "Proxies", path: "/admin/proxies", icon: Globe },
    { label: "Photos", path: "/admin/photos", icon: Image },
    { label: "Leads", path: "/admin/leads", icon: MessageSquare },
    { label: "Health", path: "/admin/health", icon: Activity },
    { label: "Alerts", path: "/admin/alerts", icon: AlertTriangle },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ];
}

interface SidebarProps {
  variant: "customer" | "admin";
}

export function SidebarNav({ variant }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("qc-sidebar-collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("qc-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  if (!user) return null;

  const navItems =
    variant === "admin"
      ? getAdminNavItems()
      : getCustomerNavItems(user.role, user.account_type);

  const isActive = (path: string) => {
    if (path === "/dashboard" || path === "/admin") {
      return location === path;
    }
    return location.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-qc-bg-primary border-r border-qc-border transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex items-center h-16 px-4 border-b border-qc-border", collapsed && "justify-center")}>
        {!collapsed && (
          <span className="text-sm font-bold bg-gradient-to-r from-qc-accent-blue to-qc-accent-purple bg-clip-text text-transparent truncate">
            {variant === "admin" ? "QC Admin" : "Quantum Connect"}
          </span>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-qc-accent-blue">Q</span>
        )}
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex items-center w-full gap-3 px-4 py-2.5 text-sm transition-colors relative",
                active
                  ? "text-qc-text-primary bg-qc-bg-card-hover"
                  : "text-qc-text-secondary hover:text-qc-text-primary hover:bg-qc-bg-card-hover",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-qc-accent-blue rounded-r" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-qc-accent-blue")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-qc-border p-2">
        {!collapsed && user.user && (
          <div className="px-2 py-2 mb-1">
            <p className="text-xs text-qc-text-primary font-medium truncate">
              {user.user.name}
            </p>
            <p className="text-xs text-qc-text-muted truncate">
              {user.dealer.name}
            </p>
          </div>
        )}
        <button
          onClick={() => logout()}
          className={cn(
            "flex items-center w-full gap-3 px-2 py-2 text-sm text-qc-text-muted hover:text-qc-danger transition-colors rounded-qc-sm",
            collapsed && "justify-center",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center w-full gap-3 px-2 py-2 text-sm text-qc-text-muted hover:text-qc-text-primary transition-colors rounded-qc-sm",
            collapsed && "justify-center",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
