# Quantum Connect AI

## Overview
Multi-tenant automotive sales platform with automated Facebook Marketplace posting, AI-powered photo processing, lead management, and comprehensive admin controls.

## Architecture
- **Frontend**: React SPA (Vite + wouter routing)
- **Backend**: Express.js API server
- **Database**: PostgreSQL (18 tables) via Drizzle ORM
- **Monorepo**: apps/workers/ (VPS worker placeholder), packages/shared/ (types/constants)

## Database Schema (18 tables)
1. **dealers** - Tenant/billing entity (dealership or individual)
2. **users** - Login accounts (roles: superadmin, owner, admin, rep)
3. **invitations** - Rep invite tokens with expiry
4. **proxies** - IP proxy pool for Facebook automation
5. **sales_reps** - Per-rep Facebook profile + browser profile
6. **subscription_addons** - Stripe add-on tracking
7. **stripe_events** - Stripe webhook event log (idempotency)
8. **facebook_groups** - Buy/sell group cross-posting config
9. **vehicles** - Inventory with photos and processing status
10. **posting_schedules** - Per-rep posting timing windows
11. **posting_log** - Every post attempt with status/screenshots
12. **leads** - Lead tracking (marketplace/messenger/sms/manual)
13. **messages** - Conversation messages per lead
14. **ghl_webhook_log** - GoHighLevel webhook events
15. **photo_processing_log** - Background replacement/plate blur log
16. **account_activity_log** - Per-rep browser session activity
17. **selector_configs** - Facebook DOM selectors (admin-editable JSON)
18. **system_alerts** - Admin alert inbox (checkpoints, bans, failures)

## API Routes
- `GET /api/health` - Database connectivity test
- `GET /api/posting/next` - Next vehicle for rep to post (placeholder)
- `POST /api/posting/log` - Report posting result (placeholder)
- `GET /api/posting/config` - Selector config (placeholder)
- `POST /api/webhooks/facebook` - Messenger webhook (placeholder)
- `POST /api/webhooks/stripe` - Stripe events (placeholder)
- `POST /api/webhooks/twilio` - SMS webhook (placeholder)
- `GET /api/admin` - Admin endpoints (placeholder)
- `GET /api/billing` - Billing endpoints (placeholder)

## Frontend Routes
### Auth
- `/login`, `/signup`, `/invite/:token`

### Dashboard (Dealer)
- `/dashboard` - Overview
- `/inventory`, `/inventory/:id` - Vehicle management
- `/posting`, `/posting/schedule`, `/posting/groups` - Posting management
- `/photos` - Photo processing
- `/leads`, `/leads/:id` - Lead management
- `/team` - Rep management
- `/billing` - Subscription management
- `/settings` - Account settings

### Admin (Superadmin)
- `/admin` - Overview
- `/admin/accounts`, `/admin/accounts/:id` - Dealership management
- `/admin/reps`, `/admin/reps/:id` - Rep management
- `/admin/posting`, `/admin/posting/selectors`, `/admin/posting/schedule`
- `/admin/proxies` - Proxy pool
- `/admin/photos` - Photo processing queue
- `/admin/leads` - All leads
- `/admin/health` - System health
- `/admin/alerts` - Alert inbox
- `/admin/settings` - System config

## QC Brand Tokens (Tailwind)
- Primary: Blue (#3B82F6) / Purple (#8B5CF6)
- Dark theme: #0A0A0B background, #111113 cards
- Font: Inter (sans), JetBrains Mono (mono)
- Custom tokens under `qc.*` namespace in tailwind config

## Environment Variables
See `.env.example` for complete list including:
- DATABASE_URL (PostgreSQL)
- NEXTAUTH_SECRET, NEXTAUTH_URL
- Stripe keys (STRIPE_SECRET_KEY, etc.)
- Facebook (FB_APP_ID, FB_APP_SECRET)
- Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
- AdsPower (ADSPOWER_API_URL, ADSPOWER_API_KEY)
- ANTHROPIC_API_KEY, REMOVEBG_API_KEY, RESEND_API_KEY

## User Hierarchy
- **superadmin** - QC internal team, admin panel access
- **owner** - Created dealership, manages billing
- **admin** - Same as owner minus delete/transfer
- **rep** - Salesperson, sees only own data

## Key Files
- `shared/schema.ts` - All 18 Drizzle table definitions + types
- `server/routes.ts` - Express API routes
- `server/storage.ts` - Database CRUD interface (DatabaseStorage)
- `server/db.ts` - PostgreSQL pool + Drizzle client
- `migrations/001_full_schema.sql` - Complete SQL schema
- `client/src/App.tsx` - All frontend routes
- `tailwind.config.ts` - QC brand tokens
- `client/src/index.css` - CSS variables (light/dark mode)
