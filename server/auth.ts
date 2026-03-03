import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { pool } from "./db";
import { users, salesReps, dealers } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { AuthScope } from "./lib/scope";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60) + "-" + Date.now().toString(36);
}

export { slugify };

declare global {
  namespace Express {
    interface User extends AuthScope {}
  }
}

export function setupAuth(app: Express): void {
  const sessionSecret = process.env.NEXTAUTH_SECRET;
  if (!sessionSecret) {
    throw new Error("NEXTAUTH_SECRET environment variable is required");
  }

  const PgSession = connectPg(session);

  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    }),
  );

  app.use(passport.initialize() as RequestHandler);
  app.use(passport.session() as RequestHandler);

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()));

          if (!user || !user.passwordHash) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.isActive) {
            return done(null, false, { message: "Account is disabled" });
          }

          const valid = await verifyPassword(password, user.passwordHash);
          if (!valid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const [dealer] = await db
            .select()
            .from(dealers)
            .where(eq(dealers.id, user.dealerId!));

          if (!dealer) {
            return done(null, false, { message: "Account not found" });
          }

          let repId: string | undefined;
          if (user.role === "rep") {
            const [rep] = await db
              .select()
              .from(salesReps)
              .where(
                and(
                  eq(salesReps.userId, user.id),
                  eq(salesReps.dealerId, dealer.id),
                ),
              );
            repId = rep?.id;
          } else if (
            user.role === "owner" &&
            dealer.accountType === "individual"
          ) {
            const [rep] = await db
              .select()
              .from(salesReps)
              .where(
                and(
                  eq(salesReps.userId, user.id),
                  eq(salesReps.dealerId, dealer.id),
                ),
              );
            repId = rep?.id;
          }

          await db
            .update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));

          const scope: AuthScope = {
            user_id: user.id,
            dealer_id: dealer.id,
            role: user.role as AuthScope["role"],
            rep_id: repId,
            account_type: dealer.accountType as AuthScope["account_type"],
          };

          return done(null, scope);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: AuthScope, done) => {
    done(null, user);
  });
}
