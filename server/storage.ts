import {
  type Dealer, type InsertDealer,
  type User, type InsertUser,
  type SalesRep, type InsertSalesRep,
  type Vehicle, type InsertVehicle,
  type Lead, type InsertLead,
  type PostingLog, type InsertPostingLog,
  type Invitation, type InsertInvitation,
  type SelectorConfig,
  type SystemAlert,
  dealers, users, salesReps, vehicles, leads, postingLog, invitations, selectorConfigs, systemAlerts,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Dealers
  getDealer(id: string): Promise<Dealer | undefined>;
  getDealerBySlug(slug: string): Promise<Dealer | undefined>;
  createDealer(dealer: InsertDealer): Promise<Dealer>;
  updateDealer(id: string, updates: Partial<Dealer>): Promise<Dealer | undefined>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUsersByDealerId(dealerId: string): Promise<User[]>;

  // Sales Reps
  getSalesRep(id: string): Promise<SalesRep | undefined>;
  getSalesRepsByDealerId(dealerId: string): Promise<SalesRep[]>;
  getActiveSalesRepsByDealerId(dealerId: string): Promise<SalesRep[]>;
  createSalesRep(rep: InsertSalesRep): Promise<SalesRep>;
  updateSalesRep(id: string, updates: Partial<SalesRep>): Promise<SalesRep | undefined>;

  // Vehicles
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehiclesByDealerId(dealerId: string): Promise<Vehicle[]>;
  getActiveVehiclesByDealerId(dealerId: string): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined>;

  // Leads
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsByDealerId(dealerId: string): Promise<Lead[]>;
  getLeadsByRepId(repId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined>;

  // Posting
  createPostingLog(log: InsertPostingLog): Promise<PostingLog>;
  getPostingLogsByRepId(repId: string): Promise<PostingLog[]>;

  // Invitations
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitation(id: string, updates: Partial<Invitation>): Promise<Invitation | undefined>;

  // Selectors
  getActiveSelectorConfigs(): Promise<SelectorConfig[]>;

  // System Alerts
  getUnresolvedAlerts(): Promise<SystemAlert[]>;
}

export class DatabaseStorage implements IStorage {
  // --- Dealers ---

  async getDealer(id: string): Promise<Dealer | undefined> {
    const [dealer] = await db.select().from(dealers).where(eq(dealers.id, id));
    return dealer;
  }

  async getDealerBySlug(slug: string): Promise<Dealer | undefined> {
    const [dealer] = await db.select().from(dealers).where(eq(dealers.slug, slug));
    return dealer;
  }

  async createDealer(dealer: InsertDealer): Promise<Dealer> {
    const [created] = await db.insert(dealers).values(dealer).returning();
    return created;
  }

  async updateDealer(id: string, updates: Partial<Dealer>): Promise<Dealer | undefined> {
    const [updated] = await db.update(dealers).set(updates).where(eq(dealers.id, id)).returning();
    return updated;
  }

  // --- Users ---

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUsersByDealerId(dealerId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.dealerId, dealerId));
  }

  // --- Sales Reps ---

  async getSalesRep(id: string): Promise<SalesRep | undefined> {
    const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, id));
    return rep;
  }

  async getSalesRepsByDealerId(dealerId: string): Promise<SalesRep[]> {
    return db.select().from(salesReps).where(eq(salesReps.dealerId, dealerId));
  }

  async getActiveSalesRepsByDealerId(dealerId: string): Promise<SalesRep[]> {
    return db
      .select()
      .from(salesReps)
      .where(and(eq(salesReps.dealerId, dealerId), eq(salesReps.status, "active")));
  }

  async createSalesRep(rep: InsertSalesRep): Promise<SalesRep> {
    const [created] = await db.insert(salesReps).values(rep).returning();
    return created;
  }

  async updateSalesRep(id: string, updates: Partial<SalesRep>): Promise<SalesRep | undefined> {
    const [updated] = await db.update(salesReps).set(updates).where(eq(salesReps.id, id)).returning();
    return updated;
  }

  // --- Vehicles ---

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async getVehiclesByDealerId(dealerId: string): Promise<Vehicle[]> {
    return db.select().from(vehicles).where(eq(vehicles.dealerId, dealerId));
  }

  async getActiveVehiclesByDealerId(dealerId: string): Promise<Vehicle[]> {
    return db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.dealerId, dealerId), eq(vehicles.status, "active")));
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [created] = await db.insert(vehicles).values(vehicle).returning();
    return created;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const [updated] = await db.update(vehicles).set(updates).where(eq(vehicles.id, id)).returning();
    return updated;
  }

  // --- Leads ---

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadsByDealerId(dealerId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.dealerId, dealerId)).orderBy(desc(leads.createdAt));
  }

  async getLeadsByRepId(repId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.repId, repId)).orderBy(desc(leads.createdAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();
    return updated;
  }

  // --- Posting ---

  async createPostingLog(log: InsertPostingLog): Promise<PostingLog> {
    const [created] = await db.insert(postingLog).values(log).returning();
    return created;
  }

  async getPostingLogsByRepId(repId: string): Promise<PostingLog[]> {
    return db.select().from(postingLog).where(eq(postingLog.repId, repId)).orderBy(desc(postingLog.createdAt));
  }

  // --- Invitations ---

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations).where(
      and(eq(invitations.token, token), eq(invitations.status, "pending"))
    );
    return invitation;
  }

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [created] = await db.insert(invitations).values(invitation).returning();
    return created;
  }

  async updateInvitation(id: string, updates: Partial<Invitation>): Promise<Invitation | undefined> {
    const [updated] = await db.update(invitations).set(updates).where(eq(invitations.id, id)).returning();
    return updated;
  }

  // --- Selectors ---

  async getActiveSelectorConfigs(): Promise<SelectorConfig[]> {
    return db.select().from(selectorConfigs).where(eq(selectorConfigs.isActive, true));
  }

  // --- System Alerts ---

  async getUnresolvedAlerts(): Promise<SystemAlert[]> {
    return db
      .select()
      .from(systemAlerts)
      .where(eq(systemAlerts.isResolved, false))
      .orderBy(desc(systemAlerts.createdAt));
  }
}

export const storage = new DatabaseStorage();
