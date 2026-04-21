-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "external_ref" TEXT,
ADD COLUMN     "fee_absorbed_by" TEXT DEFAULT 'MERCHANT',
ADD COLUMN     "gateway_fee" DECIMAL(15, 2),
ADD COLUMN     "last_checked_at" TIMESTAMP(3),
ADD COLUMN     "method" TEXT DEFAULT 'GATEWAY',
ADD COLUMN     "net_amount" DECIMAL(15, 2),
ADD COLUMN     "payment_status" TEXT DEFAULT 'PENDING',
ADD COLUMN     "platform_fee" DECIMAL(15, 2),
ADD COLUMN     "platform_fee_pending" DECIMAL(15, 2),
ADD COLUMN     "platform_fee_realized" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN     "provider" TEXT DEFAULT 'STRIPE',
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "platform_fee_ledger" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_transaction_id" TEXT NOT NULL,
    "amount" DECIMAL(15, 2) NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_fee_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_external_ref_key" ON "payment_transactions"("external_ref");

-- CreateIndex
CREATE INDEX "platform_fee_ledger_tenant_id_idx" ON "platform_fee_ledger"("tenant_id");
