import { SidebarNav } from "./sidebar-nav";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-qc-bg-primary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-qc-accent-blue" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="flex h-screen bg-qc-bg-primary overflow-hidden">
      <SidebarNav variant="customer" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
