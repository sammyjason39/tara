-- AlterTable
ALTER TABLE "finance_ledger_event_log_archive" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "discount_campaigns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(15,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "min_order_value" DECIMAL(15,2),
    "max_discount" DECIMAL(15,2),
    "promo_code" TEXT,
    "applicability_set" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regional_margins" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "region_code" TEXT NOT NULL,
    "margin_factor" DECIMAL(5,4) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regional_margins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "depreciation_method" TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
    "useful_life_years" INTEGER NOT NULL DEFAULT 5,
    "asset_account_ref" TEXT,
    "depreciation_account_ref" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_campaigns_promo_code_key" ON "discount_campaigns"("promo_code");

-- CreateIndex
CREATE INDEX "discount_campaigns_tenant_id_idx" ON "discount_campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "discount_campaigns_promo_code_idx" ON "discount_campaigns"("promo_code");

-- CreateIndex
CREATE UNIQUE INDEX "regional_margins_tenant_id_region_code_key" ON "regional_margins"("tenant_id", "region_code");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_tenant_id_code_key" ON "asset_categories"("tenant_id", "code");
