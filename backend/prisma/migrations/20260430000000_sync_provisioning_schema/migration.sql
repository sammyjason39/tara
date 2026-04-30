-- Sync Provisioning Schema Migration
-- Adds missing columns to support multi-company provisioning and primary location tracking

-- AlterTable companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "retail_id" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "primary_location_id" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "parent_id" TEXT;

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_id" TEXT;

-- AlterTable locations
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "retail_id" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "currency" TEXT;

-- AlterTable departments
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "retail_id" TEXT;
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "ecommerce_id" TEXT;

-- AlterTable employees
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "retail_id" TEXT;

-- AlterTable admin_module_statuses
ALTER TABLE "admin_module_statuses" ADD COLUMN IF NOT EXISTS "company_id" TEXT;

-- Update existing companies to have a tenant_id if possible (safety)
-- This assumes there's at least one tenant or we'll need to link them manually later
-- UPDATE "companies" SET "tenant_id" = (SELECT "id" FROM "tenants" LIMIT 1) WHERE "tenant_id" IS NULL;

-- Add Foreign Key Constraints (Optional but recommended)
-- ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- ALTER TABLE "companies" ADD CONSTRAINT "companies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
