-- Track first successful web login for WA onboarding flow
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ;

-- Backfill: employees who already changed password have logged in at least once
UPDATE "Employee"
SET "last_login_at" = "password_changed_at"
WHERE "last_login_at" IS NULL AND "password_changed_at" IS NOT NULL;
