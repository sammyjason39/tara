-- CreateTable
CREATE TABLE "procurement_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "procurement_categories_tenant_id_idx" ON "procurement_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_categories_tenant_id_name_key" ON "procurement_categories"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "procurement_categories" ADD CONSTRAINT "procurement_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
