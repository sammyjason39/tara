-- Add PIN hash field to employees table for attendance verification
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "pin_hash" TEXT;
