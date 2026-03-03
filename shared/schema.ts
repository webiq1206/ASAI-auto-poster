import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  uuid,
  boolean,
  integer,
  decimal,
  timestamp,
  time,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const dealers = pgTable("dealers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  accountType: text("account_type").notNull().default("dealership"),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  timezone: text("timezone").notNull().default("America/New_York"),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  dmsProvider: text("dms_provider"),
  dmsFeedUrl: text("dms_feed_url"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status").default("none"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  featureCoreActive: boolean("feature_core_active").default(false),
  featureCustomBackgrounds: boolean("feature_custom_backgrounds").default(false),
  featureVisualMerchandising: boolean("feature_visual_merchandising").default(false),
  featureSalesDashboard: boolean("feature_sales_dashboard").default(false),
  featureSalesDashboardSetupPaid: boolean("feature_sales_dashboard_setup_paid").default(false),
  photoBackgroundMode: text("photo_background_mode").default("replace"),
  photoBackgroundTemplate: text("photo_background_template").default("studio-white"),
  photoPlateBlur: boolean("photo_plate_blur").default(true),
  ghlLocationId: text("ghl_location_id"),
  ghlApiKeyEncrypted: text("ghl_api_key_encrypted"),
  ghlWebhookUrl: text("ghl_webhook_url"),
  ghlPipelineId: text("ghl_pipeline_id"),
  ghlCalendarId: text("ghl_calendar_id"),
  maxDailyPosts: integer("max_daily_posts").default(10),
  maxDailyGroupPosts: integer("max_daily_group_posts").default(3),
  subscriptionPlan: text("subscription_plan").default("core"),
  isPaused: boolean("is_paused").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("owner"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  invitedBy: uuid("invited_by").references(() => users.id),
  email: text("email").notNull(),
  name: text("name"),
  token: text("token").unique().notNull(),
  role: text("role").default("rep"),
  status: text("status").default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

export const proxies = pgTable("proxies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username"),
  passwordEncrypted: text("password_encrypted"),
  protocol: text("protocol").default("http"),
  geoCountry: text("geo_country"),
  geoState: text("geo_state"),
  geoCity: text("geo_city"),
  assignedRepId: uuid("assigned_rep_id"),
  status: text("status").default("available"),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastLatencyMs: integer("last_latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const salesReps = pgTable("sales_reps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  facebookEmail: text("facebook_email"),
  facebookPasswordEncrypted: text("facebook_password_encrypted"),
  facebook2faSecret: text("facebook_2fa_secret"),
  adspowerProfileId: text("adspower_profile_id"),
  proxyId: uuid("proxy_id").references(() => proxies.id),
  status: text("status").default("pending"),
  healthScore: integer("health_score").default(100),
  rampDay: integer("ramp_day").default(0),
  dailyPostLimit: integer("daily_post_limit").default(10),
  postsToday: integer("posts_today").default(0),
  dailyPostResetAt: timestamp("daily_post_reset_at", { withTimezone: true }),
  lastPostAt: timestamp("last_post_at", { withTimezone: true }),
  lastWarmupAt: timestamp("last_warmup_at", { withTimezone: true }),
  lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
  totalPosts: integer("total_posts").default(0),
  totalLeads: integer("total_leads").default(0),
  totalAppointments: integer("total_appointments").default(0),
  totalFlags: integer("total_flags").default(0),
  stripeSubscriptionItemId: text("stripe_subscription_item_id"),
  isActive: boolean("is_active").default(true),
  assignedVehicleIds: text("assigned_vehicle_ids").array(),
  assignmentMode: text("assignment_mode").default("all"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const subscriptionAddons = pgTable("subscription_addons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  addonType: text("addon_type").notNull(),
  stripeSubscriptionItemId: text("stripe_subscription_item_id"),
  status: text("status").default("active"),
  quantity: integer("quantity").default(1),
  unitPriceCents: integer("unit_price_cents"),
  setupFeePaid: boolean("setup_fee_paid").default(false),
  activatedAt: timestamp("activated_at", { withTimezone: true }).default(sql`NOW()`),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const stripeEvents = pgTable("stripe_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stripeEventId: text("stripe_event_id").unique().notNull(),
  eventType: text("event_type").notNull(),
  dealerId: uuid("dealer_id").references(() => dealers.id),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

export const facebookGroups = pgTable("facebook_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  repId: uuid("rep_id").references(() => salesReps.id, { onDelete: "cascade" }),
  groupName: text("group_name").notNull(),
  groupUrl: text("group_url").notNull(),
  groupFbId: text("group_fb_id"),
  isActive: boolean("is_active").default(true),
  postingEnabled: boolean("posting_enabled").default(true),
  maxPostsPerDay: integer("max_posts_per_day").default(3),
  minHoursBetweenPosts: integer("min_hours_between_posts").default(4),
  lastPostAt: timestamp("last_post_at", { withTimezone: true }),
  dailyPostCount: integer("daily_post_count").default(0),
  dailyPostResetAt: timestamp("daily_post_reset_at", { withTimezone: true }),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  vin: text("vin"),
  stockNumber: text("stock_number"),
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  trim: text("trim"),
  bodyType: text("body_type"),
  exteriorColor: text("exterior_color"),
  interiorColor: text("interior_color"),
  mileage: integer("mileage"),
  price: decimal("price", { precision: 10, scale: 2 }),
  msrp: decimal("msrp", { precision: 10, scale: 2 }),
  condition: text("condition").default("used"),
  transmission: text("transmission"),
  fuelType: text("fuel_type"),
  drivetrain: text("drivetrain"),
  engine: text("engine"),
  doors: integer("doors"),
  features: text("features").array(),
  descriptionRaw: text("description_raw"),
  photosOriginal: text("photos_original").array(),
  photosProcessed: text("photos_processed").array(),
  photoProcessingStatus: text("photo_processing_status").default("pending"),
  photoCount: integer("photo_count").default(0),
  vdpUrl: text("vdp_url"),
  status: text("status").default("active"),
  priceChangedAt: timestamp("price_changed_at", { withTimezone: true }),
  source: text("source").default("manual"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const postingSchedules = pgTable("posting_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  repId: uuid("rep_id").references(() => salesReps.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  postsPerDay: integer("posts_per_day").default(8),
  postingWindowStart: time("posting_window_start").default(sql`'08:00'`),
  postingWindowEnd: time("posting_window_end").default(sql`'21:00'`),
  daysOfWeek: integer("days_of_week").array().default(sql`'{1,2,3,4,5,6,0}'`),
  vehicleSelectionMode: text("vehicle_selection_mode").default("auto"),
  vehicleFilter: jsonb("vehicle_filter"),
  skipRecentlyPostedDays: integer("skip_recently_posted_days").default(3),
  enableGroupCrosspost: boolean("enable_group_crosspost").default(true),
  groupCrosspostDelayMinutes: integer("group_crosspost_delay_minutes").default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const postingLog = pgTable("posting_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  repId: uuid("rep_id").references(() => salesReps.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  scheduleId: uuid("schedule_id").references(() => postingSchedules.id),
  targetType: text("target_type").notNull().default("marketplace"),
  targetGroupId: uuid("target_group_id").references(() => facebookGroups.id),
  status: text("status").notNull(),
  fbListingId: text("fb_listing_id"),
  fbListingUrl: text("fb_listing_url"),
  generatedTitle: text("generated_title"),
  generatedDescription: text("generated_description"),
  photosUploaded: integer("photos_uploaded"),
  errorMessage: text("error_message"),
  errorScreenshotUrl: text("error_screenshot_url"),
  durationSeconds: integer("duration_seconds"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  isRenewal: boolean("is_renewal").default(false),
  originalPostingId: uuid("original_posting_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  renewalCount: integer("renewal_count").default(0),
  lastRenewedAt: timestamp("last_renewed_at", { withTimezone: true }),
  lastPriceAtPost: decimal("last_price_at_post", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  repId: uuid("rep_id").references(() => salesReps.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  postingLogId: uuid("posting_log_id").references(() => postingLog.id),
  source: text("source").notNull(),
  fbUserId: text("fb_user_id"),
  fbConversationId: text("fb_conversation_id"),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  status: text("status").default("new"),
  qualificationScore: integer("qualification_score"),
  qualificationData: jsonb("qualification_data"),
  aiHandoffReason: text("ai_handoff_reason"),
  appointmentRequestedAt: timestamp("appointment_requested_at", { withTimezone: true }),
  appointmentDate: timestamp("appointment_date", { withTimezone: true }),
  appointmentType: text("appointment_type"),
  ghlContactId: text("ghl_contact_id"),
  ghlOpportunityId: text("ghl_opportunity_id"),
  ghlSyncedAt: timestamp("ghl_synced_at", { withTimezone: true }),
  followUpCount: integer("follow_up_count").default(0),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastFollowUpAt: timestamp("last_follow_up_at", { withTimezone: true }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(),
  channel: text("channel").notNull(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  sentAt: timestamp("sent_at", { withTimezone: true }).default(sql`NOW()`),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

export const ghlWebhookLog = pgTable("ghl_webhook_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id").references(() => leads.id),
  repId: uuid("rep_id").references(() => salesReps.id),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  success: boolean("success").default(false),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

export const photoProcessingLog = pgTable("photo_processing_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  originalUrl: text("original_url").notNull(),
  processedUrl: text("processed_url"),
  processingType: text("processing_type").notNull(),
  status: text("status").default("pending"),
  backgroundTemplate: text("background_template"),
  plateDetected: boolean("plate_detected").default(false),
  plateCoordinates: jsonb("plate_coordinates"),
  errorMessage: text("error_message"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

export const accountActivityLog = pgTable("account_activity_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  repId: uuid("rep_id").references(() => salesReps.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  proxyUsed: text("proxy_used"),
  screenshotUrl: text("screenshot_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

export const selectorConfigs = pgTable("selector_configs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  selectors: jsonb("selectors").notNull(),
  isActive: boolean("is_active").default(true),
  version: integer("version").default(1),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

export const systemAlerts = pgTable("system_alerts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id),
  repId: uuid("rep_id").references(() => salesReps.id),
  alertType: text("alert_type").notNull(),
  severity: text("severity").default("warning"),
  title: text("title").notNull(),
  details: text("details"),
  screenshotUrl: text("screenshot_url"),
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

export const insertDealerSchema = createInsertSchema(dealers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvitationSchema = createInsertSchema(invitations).omit({ id: true, createdAt: true });
export const insertProxySchema = createInsertSchema(proxies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSalesRepSchema = createInsertSchema(salesReps).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriptionAddonSchema = createInsertSchema(subscriptionAddons).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStripeEventSchema = createInsertSchema(stripeEvents).omit({ id: true, createdAt: true });
export const insertFacebookGroupSchema = createInsertSchema(facebookGroups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPostingScheduleSchema = createInsertSchema(postingSchedules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPostingLogSchema = createInsertSchema(postingLog).omit({ id: true, createdAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertGhlWebhookLogSchema = createInsertSchema(ghlWebhookLog).omit({ id: true, createdAt: true });
export const insertPhotoProcessingLogSchema = createInsertSchema(photoProcessingLog).omit({ id: true, createdAt: true });
export const insertAccountActivityLogSchema = createInsertSchema(accountActivityLog).omit({ id: true, createdAt: true });
export const insertSelectorConfigSchema = createInsertSchema(selectorConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSystemAlertSchema = createInsertSchema(systemAlerts).omit({ id: true, createdAt: true });

export type InsertDealer = z.infer<typeof insertDealerSchema>;
export type Dealer = typeof dealers.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;
export type InsertProxy = z.infer<typeof insertProxySchema>;
export type Proxy = typeof proxies.$inferSelect;
export type InsertSalesRep = z.infer<typeof insertSalesRepSchema>;
export type SalesRep = typeof salesReps.$inferSelect;
export type InsertSubscriptionAddon = z.infer<typeof insertSubscriptionAddonSchema>;
export type SubscriptionAddon = typeof subscriptionAddons.$inferSelect;
export type InsertStripeEvent = z.infer<typeof insertStripeEventSchema>;
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type InsertFacebookGroup = z.infer<typeof insertFacebookGroupSchema>;
export type FacebookGroup = typeof facebookGroups.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertPostingSchedule = z.infer<typeof insertPostingScheduleSchema>;
export type PostingSchedule = typeof postingSchedules.$inferSelect;
export type InsertPostingLog = z.infer<typeof insertPostingLogSchema>;
export type PostingLog = typeof postingLog.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertGhlWebhookLog = z.infer<typeof insertGhlWebhookLogSchema>;
export type GhlWebhookLog = typeof ghlWebhookLog.$inferSelect;
export type InsertPhotoProcessingLog = z.infer<typeof insertPhotoProcessingLogSchema>;
export type PhotoProcessingLog = typeof photoProcessingLog.$inferSelect;
export type InsertAccountActivityLog = z.infer<typeof insertAccountActivityLogSchema>;
export type AccountActivityLog = typeof accountActivityLog.$inferSelect;
export type InsertSelectorConfig = z.infer<typeof insertSelectorConfigSchema>;
export type SelectorConfig = typeof selectorConfigs.$inferSelect;
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
export type SystemAlert = typeof systemAlerts.$inferSelect;
