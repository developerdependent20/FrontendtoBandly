-- Add decline_reason column to event_roster table
-- Run this in Supabase SQL Editor

ALTER TABLE event_roster 
ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'event_roster' 
ORDER BY ordinal_position;
