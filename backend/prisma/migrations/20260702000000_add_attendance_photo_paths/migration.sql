-- Attendance selfie photos (clock-in / clock-out verification)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS clock_in_photo_path TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS clock_out_photo_path TEXT;
