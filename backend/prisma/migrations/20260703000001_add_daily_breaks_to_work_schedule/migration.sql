-- Add daily_breaks column to work_schedules table
ALTER TABLE work_schedules ADD COLUMN IF NOT EXISTS daily_breaks JSONB;
