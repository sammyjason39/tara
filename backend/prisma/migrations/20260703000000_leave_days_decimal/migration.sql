-- Support fractional leave days (0.5 half-day increments)

ALTER TABLE "leave_requests"
  ALTER COLUMN "total_days" TYPE DECIMAL(6, 2) USING "total_days"::decimal;

ALTER TABLE "leave_balances"
  ALTER COLUMN "total_entitlement" TYPE DECIMAL(8, 2) USING "total_entitlement"::decimal,
  ALTER COLUMN "used_days" TYPE DECIMAL(8, 2) USING "used_days"::decimal,
  ALTER COLUMN "remaining_days" TYPE DECIMAL(8, 2) USING "remaining_days"::decimal,
  ALTER COLUMN "carryover_days" TYPE DECIMAL(8, 2) USING "carryover_days"::decimal;

-- Allow multiple balance rows per employee (one per year)
DROP INDEX IF EXISTS "leave_balances_employee_id_key";
