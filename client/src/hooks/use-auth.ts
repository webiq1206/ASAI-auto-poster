import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export interface AuthUser {
  user_id: string;
  dealer_id: string;
  role: "owner" | "admin" | "rep" | "superadmin";
  rep_id?: string;
  account_type: "dealership" | "individual";
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
  dealer: {
    id: string;
    name: string;
    accountType: string;
  };
  features: {
    core: boolean;
    customBackgrounds: boolean;
    visualMerchandising: boolean;
    salesDashboard: boolean;
    trialActive: boolean;
  };
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: {
      account_type: "dealership" | "individual";
      name: string;
      email: string;
      password: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
    }) => {
      const res = await apiRequest("POST", "/api/auth/signup", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (data.redirect) setLocation(data.redirect);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isOwner: user?.role === "owner",
    isAdmin: user?.role === "admin",
    isOwnerOrAdmin: user?.role === "owner" || user?.role === "admin",
    isRep: user?.role === "rep",
    isSuperadmin: user?.role === "superadmin",
    isIndividual: user?.account_type === "individual",
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginError: loginMutation.error,
    signupError: signupMutation.error,
    isLoginPending: loginMutation.isPending,
    isSignupPending: signupMutation.isPending,
  };
}
