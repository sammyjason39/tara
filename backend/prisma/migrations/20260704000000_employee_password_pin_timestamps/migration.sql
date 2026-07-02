-- Track when password/PIN were last set so we stop re-prompting after first change.

ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "pin_changed_at" TIMESTAMPTZ;

-- Existing users who were already allowed past force-change: treat password as initialized.
UPDATE "employees"
SET "password_changed_at" = COALESCE("updated_at", NOW())
WHERE "must_change_password" = false
  AND "password_changed_at" IS NULL;

-- PIN already set before this column existed.
UPDATE "employees"
SET "pin_changed_at" = COALESCE("updated_at", NOW())
WHERE "pin_hash" IS NOT NULL
  AND "pin_changed_at" IS NULL;
