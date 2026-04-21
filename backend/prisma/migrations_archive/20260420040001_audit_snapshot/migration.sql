-- CreateTable
CREATE TABLE "audit_chain_repairs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "previous_hash" TEXT NOT NULL,
    "new_hash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source_ip" TEXT,
    "request_id" TEXT,
    "permission_by" TEXT,
    "permission_at" TIMESTAMP(3),
    "snapshot_json" JSONB,
    "range_start_id" TEXT,
    "range_end_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_chain_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_chain_repairs_tenant_id_idx" ON "audit_chain_repairs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_chain_repairs_created_at_idx" ON "audit_chain_repairs"("created_at");
