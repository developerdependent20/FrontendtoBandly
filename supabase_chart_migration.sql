-- Add chart_data and chart_annotations columns to songs table
-- Run this in Supabase SQL Editor

ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS chart_data TEXT,
ADD COLUMN IF NOT EXISTS chart_annotations TEXT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'songs' 
ORDER BY ordinal_position;
