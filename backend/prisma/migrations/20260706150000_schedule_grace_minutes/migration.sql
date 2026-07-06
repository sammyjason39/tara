-- Add grace period (toleransi keterlambatan) per work schedule
ALTER TABLE "work_schedules" ADD COLUMN "grace_minutes" INTEGER NOT NULL DEFAULT 0;
