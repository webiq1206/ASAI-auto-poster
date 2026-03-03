import type { Request, Response, NextFunction } from "express";
import type { AuthScope } from "../lib/scope";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireRoles(...roles: Array<AuthScope["role"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = req.user as AuthScope;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export function requireOwnerOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const user = req.user as AuthScope;
  if (user.role !== "owner" && user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ error: "Owner or admin access required" });
  }
  next();
}

export function requireSuperadmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const user = req.user as AuthScope;
  if (user.role !== "superadmin") {
    return res.status(403).json({ error: "Superadmin access required" });
  }
  next();
}

export function requireVpsApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const apiKey = req.headers["x-vps-api-key"];
  const expected = process.env.VPS_API_KEY;
  if (!expected || apiKey !== expected) {
    return res.status(401).json({ error: "Invalid VPS API key" });
  }
  next();
}
