-- ============================================
-- QUANTUM CONNECT AI - COMPLETE DATABASE SCHEMA
-- 18 tables + indexes
-- Aligned with Doc 2 Final: per-rep model, admin panel, invitations, proxies, selectors
-- Run this ONCE on initial setup
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. DEALERS (billing entity / tenant)
-- Serves as the "account" for both dealerships and individual salespeople.
-- ============================================
CREATE TABLE dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL DEFAULT 'dealership',
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  logo_url TEXT,
  website_url TEXT,
  dms_provider TEXT,
  dms_feed_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_subscription_status TEXT DEFAULT 'none',
  trial_ends_at TIMESTAMPTZ,
  feature_core_active BOOLEAN DEFAULT false,
  feature_custom_backgrounds BOOLEAN DEFAULT false,
  feature_visual_merchandising BOOLEAN DEFAULT false,
  feature_sales_dashboard BOOLEAN DEFAULT false,
  feature_sales_dashboard_setup_paid BOOLEAN DEFAULT false,
  photo_background_mode TEXT DEFAULT 'replace',
  photo_background_template TEXT DEFAULT 'studio-white',
  photo_plate_blur BOOLEAN DEFAULT true,
  ghl_location_id TEXT,
  ghl_api_key_encrypted TEXT,
  ghl_webhook_url TEXT,
  ghl_pipeline_id TEXT,
  ghl_calendar_id TEXT,
  max_daily_posts INTEGER DEFAULT 10,
  max_daily_group_posts INTEGER DEFAULT 3,
  subscription_plan TEXT DEFAULT 'core',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USERS (every person who can log in)
-- Roles: 'owner', 'admin', 'rep', 'superadmin'
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. INVITATIONS (rep invite tokens)
-- ============================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id),
  email TEXT NOT NULL,
  name TEXT,
  token TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'rep',
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. PROXIES (managed by admin panel)
-- ============================================
CREATE TABLE proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT,
  password_encrypted TEXT,
  protocol TEXT DEFAULT 'http',
  geo_country TEXT,
  geo_state TEXT,
  geo_city TEXT,
  assigned_rep_id UUID,
  status TEXT DEFAULT 'available',
  last_tested_at TIMESTAMPTZ,
  last_latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SALES REPS (each rep = one Facebook profile = one browser profile)
-- ============================================
CREATE TABLE sales_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  facebook_email TEXT,
  facebook_password_encrypted TEXT,
  facebook_2fa_secret TEXT,
  adspower_profile_id TEXT,
  proxy_id UUID REFERENCES proxies(id),
  status TEXT DEFAULT 'pending',
  health_score INTEGER DEFAULT 100,
  ramp_day INTEGER DEFAULT 0,
  daily_post_limit INTEGER DEFAULT 10,
  posts_today INTEGER DEFAULT 0,
  daily_post_reset_at TIMESTAMPTZ,
  last_post_at TIMESTAMPTZ,
  last_warmup_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  total_posts INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  total_appointments INTEGER DEFAULT 0,
  total_flags INTEGER DEFAULT 0,
  stripe_subscription_item_id TEXT,
  is_active BOOLEAN DEFAULT true,
  assigned_vehicle_ids UUID[],
  assignment_mode TEXT DEFAULT 'all',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE proxies ADD CONSTRAINT fk_proxy_rep
  FOREIGN KEY (assigned_rep_id) REFERENCES sales_reps(id) ON DELETE SET NULL;

-- ============================================
-- 6. SUBSCRIPTION ADD-ONS
-- ============================================
CREATE TABLE subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL,
  stripe_subscription_item_id TEXT,
  status TEXT DEFAULT 'active',
  quantity INTEGER DEFAULT 1,
  unit_price_cents INTEGER,
  setup_fee_paid BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. STRIPE EVENTS LOG (idempotency)
-- ============================================
CREATE TABLE stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  dealer_id UUID REFERENCES dealers(id),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. FACEBOOK GROUPS (Buy/Sell cross-posting)
-- ============================================
CREATE TABLE facebook_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  rep_id UUID REFERENCES sales_reps(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  group_url TEXT NOT NULL,
  group_fb_id TEXT,
  is_active BOOLEAN DEFAULT true,
  posting_enabled BOOLEAN DEFAULT true,
  max_posts_per_day INTEGER DEFAULT 3,
  min_hours_between_posts INTEGER DEFAULT 4,
  last_post_at TIMESTAMPTZ,
  daily_post_count INTEGER DEFAULT 0,
  daily_post_reset_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. VEHICLES (inventory, shared across account)
-- ============================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  vin TEXT,
  stock_number TEXT,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  body_type TEXT,
  exterior_color TEXT,
  interior_color TEXT,
  mileage INTEGER,
  price DECIMAL(10,2),
  msrp DECIMAL(10,2),
  condition TEXT DEFAULT 'used',
  transmission TEXT,
  fuel_type TEXT,
  drivetrain TEXT,
  engine TEXT,
  doors INTEGER,
  features TEXT[],
  description_raw TEXT,
  photos_original TEXT[],
  photos_processed TEXT[],
  photo_processing_status TEXT DEFAULT 'pending',
  photo_count INTEGER DEFAULT 0,
  vdp_url TEXT,
  status TEXT DEFAULT 'active',
  price_changed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. POSTING SCHEDULES (per rep)
-- ============================================
CREATE TABLE posting_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  rep_id UUID REFERENCES sales_reps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  posts_per_day INTEGER DEFAULT 8,
  posting_window_start TIME DEFAULT '08:00',
  posting_window_end TIME DEFAULT '21:00',
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,0}',
  vehicle_selection_mode TEXT DEFAULT 'auto',
  vehicle_filter JSONB,
  skip_recently_posted_days INTEGER DEFAULT 3,
  enable_group_crosspost BOOLEAN DEFAULT true,
  group_crosspost_delay_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. POSTING LOG (per rep, tracks every post attempt)
-- ============================================
CREATE TABLE posting_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  rep_id UUID REFERENCES sales_reps(id),
  vehicle_id UUID REFERENCES vehicles(id),
  schedule_id UUID REFERENCES posting_schedules(id),
  target_type TEXT NOT NULL DEFAULT 'marketplace',
  target_group_id UUID REFERENCES facebook_groups(id),
  status TEXT NOT NULL,
  fb_listing_id TEXT,
  fb_listing_url TEXT,
  generated_title TEXT,
  generated_description TEXT,
  photos_uploaded INTEGER,
  error_message TEXT,
  error_screenshot_url TEXT,
  duration_seconds INTEGER,
  scheduled_for TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  is_renewal BOOLEAN DEFAULT false,
  original_posting_id UUID,
  expires_at TIMESTAMPTZ,
  renewal_count INTEGER DEFAULT 0,
  last_renewed_at TIMESTAMPTZ,
  last_price_at_post DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. LEADS (routed to specific rep)
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  rep_id UUID REFERENCES sales_reps(id),
  vehicle_id UUID REFERENCES vehicles(id),
  posting_log_id UUID REFERENCES posting_log(id),
  source TEXT NOT NULL,
  fb_user_id TEXT,
  fb_conversation_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'new',
  qualification_score INTEGER,
  qualification_data JSONB,
  ai_handoff_reason TEXT,
  appointment_requested_at TIMESTAMPTZ,
  appointment_date TIMESTAMPTZ,
  appointment_type TEXT,
  ghl_contact_id TEXT,
  ghl_opportunity_id TEXT,
  ghl_synced_at TIMESTAMPTZ,
  follow_up_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_follow_up_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. MESSAGES
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  channel TEXT NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. GHL WEBHOOK LOG
-- ============================================
CREATE TABLE ghl_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  rep_id UUID REFERENCES sales_reps(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN DEFAULT false,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. PHOTO PROCESSING LOG
-- ============================================
CREATE TABLE photo_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  processed_url TEXT,
  processing_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  background_template TEXT,
  plate_detected BOOLEAN DEFAULT false,
  plate_coordinates JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 16. ACCOUNT ACTIVITY LOG (per rep browser session)
-- ============================================
CREATE TABLE account_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID REFERENCES sales_reps(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  proxy_used TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. SELECTOR CONFIGS (Facebook form selectors, managed by admin)
-- ============================================
CREATE TABLE selector_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  selectors JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_tested_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 18. SYSTEM ALERTS (admin alert inbox)
-- ============================================
CREATE TABLE system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id),
  rep_id UUID REFERENCES sales_reps(id),
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  title TEXT NOT NULL,
  details TEXT,
  screenshot_url TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_dealer ON users(dealer_id, role, is_active);
CREATE INDEX idx_invitations_token ON invitations(token) WHERE status = 'pending';
CREATE INDEX idx_invitations_dealer ON invitations(dealer_id, status);
CREATE INDEX idx_sales_reps_dealer ON sales_reps(dealer_id, is_active);
CREATE INDEX idx_sales_reps_user ON sales_reps(user_id);
CREATE INDEX idx_sales_reps_status ON sales_reps(status) WHERE is_active = true;
CREATE INDEX idx_proxies_status ON proxies(status);
CREATE INDEX idx_proxies_rep ON proxies(assigned_rep_id);
CREATE INDEX idx_vehicles_dealer ON vehicles(dealer_id, status);
CREATE INDEX idx_vehicles_photo_status ON vehicles(dealer_id, photo_processing_status);
CREATE INDEX idx_posting_log_dealer ON posting_log(dealer_id, status, scheduled_for);
CREATE INDEX idx_posting_log_rep ON posting_log(rep_id, posted_at DESC);
CREATE INDEX idx_posting_log_vehicle ON posting_log(vehicle_id, posted_at DESC);
CREATE INDEX idx_posting_log_renewal ON posting_log(dealer_id, expires_at, status) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_leads_dealer ON leads(dealer_id, status, created_at DESC);
CREATE INDEX idx_leads_rep ON leads(rep_id, status, created_at DESC);
CREATE INDEX idx_leads_ghl ON leads(dealer_id, ghl_synced_at) WHERE ghl_contact_id IS NULL;
CREATE INDEX idx_messages_lead ON messages(lead_id, sent_at);
CREATE INDEX idx_fb_groups_dealer ON facebook_groups(dealer_id, is_active);
CREATE INDEX idx_fb_groups_rep ON facebook_groups(rep_id, is_active);
CREATE INDEX idx_ghl_webhook_retry ON ghl_webhook_log(success, next_retry_at) WHERE success = false;
CREATE INDEX idx_ghl_webhook_rep ON ghl_webhook_log(rep_id);
CREATE INDEX idx_stripe_events_type ON stripe_events(event_type, processed);
CREATE INDEX idx_subscription_addons_dealer ON subscription_addons(dealer_id, addon_type, status);
CREATE INDEX idx_photo_log_vehicle ON photo_processing_log(vehicle_id, status);
CREATE INDEX idx_activity_log_rep ON account_activity_log(rep_id, created_at DESC);
CREATE INDEX idx_selector_configs_active ON selector_configs(is_active, name);
CREATE INDEX idx_alerts_unresolved ON system_alerts(is_resolved, severity, created_at DESC) WHERE is_resolved = false;
CREATE INDEX idx_alerts_dealer ON system_alerts(dealer_id, created_at DESC);
CREATE INDEX idx_alerts_rep ON system_alerts(rep_id, created_at DESC);
