import {
  type Dealer, type InsertDealer,
  type User, type InsertUser,
  type SalesRep, type InsertSalesRep,
  type Vehicle, type InsertVehicle,
  type Lead, type InsertLead,
  type PostingLog, type InsertPostingLog,
  type Invitation, type InsertInvitation,
  type SelectorConfig,
  dealers, users, salesReps, vehicles, leads, postingLog, invitations, selectorConfigs,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getDealer(id: string): Promise<Dealer | undefined>;
  getDealerBySlug(slug: string): Promise<Dealer | undefined>;
  createDealer(dealer: InsertDealer): Promise<Dealer>;

  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByDealerId(dealerId: string): Promise<User[]>;

  getSalesRep(id: string): Promise<SalesRep | undefined>;
  getSalesRepsByDealerId(dealerId: string): Promise<SalesRep[]>;
  createSalesRep(rep: InsertSalesRep): Promise<SalesRep>;

  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehiclesByDealerId(dealerId: string): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;

  getLead(id: string): Promise<Lead | undefined>;
  getLeadsByDealerId(dealerId: string): Promise<Lead[]>;
  getLeadsByRepId(repId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;

  createPostingLog(log: InsertPostingLog): Promise<PostingLog>;
  getPostingLogsByRepId(repId: string): Promise<PostingLog[]>;

  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;

  getActiveSelectorConfigs(): Promise<SelectorConfig[]>;
}

export class DatabaseStorage implements IStorage {
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

  async getUsersByDealerId(dealerId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.dealerId, dealerId));
  }

  async getSalesRep(id: string): Promise<SalesRep | undefined> {
    const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, id));
    return rep;
  }

  async getSalesRepsByDealerId(dealerId: string): Promise<SalesRep[]> {
    return db.select().from(salesReps).where(eq(salesReps.dealerId, dealerId));
  }

  async createSalesRep(rep: InsertSalesRep): Promise<SalesRep> {
    const [created] = await db.insert(salesReps).values(rep).returning();
    return created;
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async getVehiclesByDealerId(dealerId: string): Promise<Vehicle[]> {
    return db.select().from(vehicles).where(eq(vehicles.dealerId, dealerId));
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [created] = await db.insert(vehicles).values(vehicle).returning();
    return created;
  }

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

  async createPostingLog(log: InsertPostingLog): Promise<PostingLog> {
    const [created] = await db.insert(postingLog).values(log).returning();
    return created;
  }

  async getPostingLogsByRepId(repId: string): Promise<PostingLog[]> {
    return db.select().from(postingLog).where(eq(postingLog.repId, repId)).orderBy(desc(postingLog.createdAt));
  }

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

  async getActiveSelectorConfigs(): Promise<SelectorConfig[]> {
    return db.select().from(selectorConfigs).where(eq(selectorConfigs.isActive, true));
  }
}

export const storage = new DatabaseStorage();
