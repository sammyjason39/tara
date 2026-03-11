-- AlterTable
ALTER TABLE "item_masters" ADD COLUMN     "department_id" TEXT;

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "extra_info" JSONB,
ADD COLUMN     "purpose" TEXT;

-- CreateTable
CREATE TABLE "capex_budgets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "allocated_budget" DECIMAL(15,2) NOT NULL,
    "committed_budget" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "available_budget" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capex_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "threshold" DECIMAL(15,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_insights" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "trend" TEXT NOT NULL,
    "actionable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNRESOLVED',
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "finance_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciation_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "depreciation_exp" DECIMAL(15,2) NOT NULL,
    "accumulated_dep" DECIMAL(15,2) NOT NULL,
    "carrying_value" DECIMAL(15,2) NOT NULL,
    "journal_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_depreciation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capex_budgets_tenant_id_idx" ON "capex_budgets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "capex_budgets_tenant_id_department_period_key" ON "capex_budgets"("tenant_id", "department", "period");

-- CreateIndex
CREATE INDEX "accounting_periods_tenant_id_idx" ON "accounting_periods"("tenant_id");

-- CreateIndex
CREATE INDEX "accounting_periods_status_idx" ON "accounting_periods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_tenant_id_name_key" ON "accounting_periods"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "finance_documents_tenant_id_idx" ON "finance_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_policies_tenant_id_idx" ON "finance_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_insights_tenant_id_idx" ON "finance_insights"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_alerts_tenant_id_idx" ON "finance_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_alerts_status_idx" ON "finance_alerts"("status");

-- CreateIndex
CREATE INDEX "asset_depreciation_entries_tenant_id_asset_id_idx" ON "asset_depreciation_entries"("tenant_id", "asset_id");

-- CreateIndex
CREATE INDEX "asset_events_tenant_id_asset_id_idx" ON "asset_events"("tenant_id", "asset_id");

-- AddForeignKey
ALTER TABLE "item_masters" ADD CONSTRAINT "item_masters_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
