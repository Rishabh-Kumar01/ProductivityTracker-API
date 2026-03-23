-- Migration 001: Fix duplicate activity records
-- Run this against your Neon PostgreSQL database

-- Step 1: Delete duplicate records, keeping the earliest copy (by id) for each (user_id, app_name, start_time) combination
DELETE FROM activities a
USING activities b
WHERE a.user_id = b.user_id
  AND a.app_name = b.app_name
  AND a.start_time = b.start_time
  AND a.id > b.id;

-- Step 2: Add composite unique constraint to prevent future duplicates
ALTER TABLE activities ADD CONSTRAINT uq_activities_user_app_start
    UNIQUE (user_id, app_name, start_time);
