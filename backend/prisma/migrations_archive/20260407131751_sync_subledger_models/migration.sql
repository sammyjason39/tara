/*
  Warnings:

  - You are about to drop the column `metadata` on the `inventory_subledger_entries` table. All the data in the column will be lost.
  - Added the required column `accounting_period_id` to the `inventory_subledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `inventory_subledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `inventory_subledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inventory_transaction_id` to the `inventory_subledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location_id` to the `inventory_subledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `posting_request_id` to the `inventory_subledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qty` to the `inventory_subledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku_id` to the `inventory_subledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_cost` to the `inventory_subledger_entries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inventory_subledger_entries" DROP COLUMN "metadata",
ADD COLUMN     "accounting_period_id" TEXT NOT NULL,
ADD COLUMN     "amount" DECIMAL(20,2) NOT NULL,
ADD COLUMN     "base_amount" DECIMAL(20,2),
ADD COLUMN     "base_currency" TEXT,
ADD COLUMN     "cost_version_id" TEXT,
ADD COLUMN     "credit_account_id" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "debit_account_id" TEXT,
ADD COLUMN     "exchange_rate" DECIMAL(20,2),
ADD COLUMN     "failure_type" TEXT,
ADD COLUMN     "gl_journal_id" TEXT,
ADD COLUMN     "inventory_transaction_id" TEXT NOT NULL,
ADD COLUMN     "location_id" TEXT NOT NULL,
ADD COLUMN     "posted_period_id" TEXT,
ADD COLUMN     "posting_request_id" TEXT NOT NULL,
ADD COLUMN     "qty" DECIMAL(20,2) NOT NULL,
ADD COLUMN     "reference_id" TEXT,
ADD COLUMN     "reference_type" TEXT,
ADD COLUMN     "sku_id" TEXT NOT NULL,
ADD COLUMN     "unit_cost" DECIMAL(20,2) NOT NULL;

-- CreateTable
CREATE TABLE "finance_subledger_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "source_module" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "reference_line_id" TEXT,
    "source_event_id" TEXT NOT NULL,
    "posting_request_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "entry_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "accounting_period_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "base_amount" DECIMAL(20,2) NOT NULL,
    "base_currency" TEXT NOT NULL,
    "exchange_rate" DECIMAL(20,2) NOT NULL,
    "debit_account_id" TEXT NOT NULL,
    "credit_account_id" TEXT NOT NULL,
    "gl_journal_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "failure_type" TEXT,
    "failure_message" TEXT,
    "reversal_of_entry_id" TEXT,
    "reversed_by_entry_id" TEXT,
    "branch_id" TEXT,
    "location_id" TEXT,
    "department_id" TEXT,
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_subledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_subledger_entries_tenant_id_company_id_idx" ON "finance_subledger_entries"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "finance_subledger_entries_source_event_id_idx" ON "finance_subledger_entries"("source_event_id");

-- CreateIndex
CREATE INDEX "finance_subledger_entries_posting_request_id_idx" ON "finance_subledger_entries"("posting_request_id");

-- CreateIndex
CREATE INDEX "finance_subledger_entries_reference_id_idx" ON "finance_subledger_entries"("reference_id");

-- AddForeignKey
ALTER TABLE "finance_subledger_entries" ADD CONSTRAINT "finance_subledger_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
