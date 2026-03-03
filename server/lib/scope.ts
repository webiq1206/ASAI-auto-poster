import type { Request } from "express";

export interface AuthScope {
  user_id: string;
  dealer_id: string;
  role: "owner" | "admin" | "rep" | "superadmin";
  rep_id?: string;
  account_type: "dealership" | "individual";
}

export function getScope(req: Request): AuthScope {
  const user = req.user as AuthScope | undefined;
  if (!user) throw new Error("No authenticated user on request");
  return user;
}

export function requireRole(...roles: string[]) {
  return (req: Request): boolean => {
    const scope = getScope(req);
    return roles.includes(scope.role);
  };
}

export function isOwnerOrAdmin(req: Request): boolean {
  const scope = getScope(req);
  return scope.role === "owner" || scope.role === "admin";
}

export function isSuperadmin(req: Request): boolean {
  const scope = getScope(req);
  return scope.role === "superadmin";
}
