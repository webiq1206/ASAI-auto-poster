export const APP_NAME = 'Quantum Connect AI';

export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  ADMIN: 'admin',
  REP: 'rep',
} as const;

export const REP_STATUSES = {
  PENDING: 'pending',
  WARMING: 'warming',
  ACTIVE: 'active',
  PAUSED: 'paused',
  FLAGGED: 'flagged',
  BANNED: 'banned',
} as const;

export const POSTING_TARGETS = {
  MARKETPLACE: 'marketplace',
  GROUP: 'group',
} as const;

export const LEAD_SOURCES = {
  MARKETPLACE: 'marketplace',
  MESSENGER: 'messenger',
  SMS: 'sms',
  MANUAL: 'manual',
} as const;

export const LEAD_STATUSES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  APPOINTMENT_SET: 'appointment_set',
  SHOWED: 'showed',
  SOLD: 'sold',
  LOST: 'lost',
} as const;

export const SUBSCRIPTION_PLANS = {
  CORE: 'core',
  BACKGROUNDS: 'backgrounds',
  VISUAL_MERCH: 'visual_merch',
  DASHBOARD: 'dashboard',
} as const;

export const ALERT_SEVERITIES = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;
