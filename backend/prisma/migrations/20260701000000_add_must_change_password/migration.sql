-- Require password change on first login (default / seeded passwords)
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;
