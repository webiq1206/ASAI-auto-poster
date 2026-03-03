-- Add is_paused column to dealers table for per-account posting pause
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
