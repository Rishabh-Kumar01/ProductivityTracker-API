-- Migration 002: Add domain column to activities
-- Run this against your Neon PostgreSQL database

-- Add domain column
ALTER TABLE activities ADD COLUMN IF NOT EXISTS domain VARCHAR(255);

-- Index for domain queries
CREATE INDEX IF NOT EXISTS idx_activities_domain ON activities (user_id, domain, start_time DESC);

-- Backfill existing records: extract domain from URL
UPDATE activities
SET domain = substring(url from 'https?://(?:www\.)?([^/]+)')
WHERE url IS NOT NULL AND url != '' AND domain IS NULL;
