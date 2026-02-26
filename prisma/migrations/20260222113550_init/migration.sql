/*
  Warnings:

  - You are about to drop the column `branch_id` on the `ecommerce_connectors` table. All the data in the column will be lost.
  - You are about to drop the column `department_code` on the `inventory_adjustments` table. All the data in the column will be lost.
  - You are about to drop the column `location_code` on the `inventory_adjustments` table. All the data in the column will be lost.
  - You are about to drop the `payment_settlement_records` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[location_id,product_id,department_id]` on the table `stock_levels` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `location_id` to the `inventory_adjustments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payment_evidence_packs" DROP CONSTRAINT "payment_evidence_packs_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_settlement_records" DROP CONSTRAINT "payment_settlement_records_company_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_settlement_records" DROP CONSTRAINT "payment_settlement_records_payment_id_fkey";

-- DropIndex
DROP INDEX "stock_levels_location_id_product_id_key";

-- AlterTable
ALTER TABLE "ecommerce_connectors" DROP COLUMN "branch_id",
ADD COLUMN     "inventory_pool_id" TEXT,
ADD COLUMN     "manager_id" TEXT,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "platform" TEXT NOT NULL DEFAULT 'custom',
ADD COLUMN     "settings" JSONB;

-- AlterTable
ALTER TABLE "inventory_adjustments" DROP COLUMN "department_code",
DROP COLUMN "location_code",
ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "location_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "evidence_pack_id" TEXT,
ADD COLUMN     "ledger_sync_triggered_at" TIMESTAMP(3),
ADD COLUMN     "settlement_id" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "module_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "retail_channels" ADD COLUMN     "adapter_type" TEXT NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN     "credentials" JSONB,
ADD COLUMN     "integration_category" TEXT NOT NULL DEFAULT 'PRESET',
ADD COLUMN     "webhook_url" TEXT;

-- AlterTable
ALTER TABLE "stock_levels" ADD COLUMN     "department_id" TEXT;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "from_department_id" TEXT,
ADD COLUMN     "to_department_id" TEXT,
ADD COLUMN     "unit_cost" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "email" TEXT,
ADD COLUMN     "inventory_pool_id" TEXT,
ADD COLUMN     "operating_hours" JSONB,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "settings" JSONB,
ADD COLUMN     "timezone" TEXT DEFAULT 'Asia/Jakarta';

-- DropTable
DROP TABLE "payment_settlement_records";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_carts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_wishlists" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_wishlist_items" (
    "id" TEXT NOT NULL,
    "wishlist_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_customer_auth" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_at" TIMESTAMP(3),
    "locked_until" TIMESTAMP(3),
    "password_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_customer_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_customer_sessions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_gateway_nodes" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "load_balancer_id" TEXT,
    "node_name" TEXT NOT NULL,
    "ip_address" TEXT,
    "port" INTEGER NOT NULL DEFAULT 3000,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "health_score" INTEGER NOT NULL DEFAULT 100,
    "last_heartbeat" TIMESTAMP(3),
    "version" TEXT,
    "region" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_gateway_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_load_balancers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "virtual_ip" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'ROUND_ROBIN',
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retail_load_balancers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_devices" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "location_id" TEXT,
    "owner_id" TEXT,
    "device_type" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "serial_number" TEXT,
    "ip_address" TEXT,
    "mac_address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_system_health" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "latency_ms" INTEGER NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "it_system_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_provisioning_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "supplier_id" TEXT,
    "supplier_branch_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ACCOUNT',
    "scope" TEXT DEFAULT 'full_portal',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requested_by" TEXT NOT NULL,
    "provisioned_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_provisioning_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_settings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_settlements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "provider_reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMP(3),
    "retry_attempts" JSONB,
    "ledger_sync_triggered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_pools" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'shared',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inventory_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_pool_stock" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "on_hand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pool_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EcommerceBranchLinks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EcommerceBranchLinks_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_companies_user_id_company_id_key" ON "user_companies"("user_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_carts_customer_id_key" ON "retail_carts"("customer_id");

-- CreateIndex
CREATE INDEX "retail_carts_company_id_idx" ON "retail_carts"("company_id");

-- CreateIndex
CREATE INDEX "retail_cart_items_cart_id_idx" ON "retail_cart_items"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_cart_items_cart_id_product_id_key" ON "retail_cart_items"("cart_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_wishlists_customer_id_key" ON "retail_wishlists"("customer_id");

-- CreateIndex
CREATE INDEX "retail_wishlists_company_id_idx" ON "retail_wishlists"("company_id");

-- CreateIndex
CREATE INDEX "retail_wishlist_items_wishlist_id_idx" ON "retail_wishlist_items"("wishlist_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_wishlist_items_wishlist_id_product_id_key" ON "retail_wishlist_items"("wishlist_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_customer_auth_customer_id_key" ON "retail_customer_auth"("customer_id");

-- CreateIndex
CREATE INDEX "retail_customer_sessions_customer_id_idx" ON "retail_customer_sessions"("customer_id");

-- CreateIndex
CREATE INDEX "retail_customer_sessions_company_id_idx" ON "retail_customer_sessions"("company_id");

-- CreateIndex
CREATE INDEX "retail_customer_sessions_expires_at_idx" ON "retail_customer_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "retail_gateway_nodes_company_id_idx" ON "retail_gateway_nodes"("company_id");

-- CreateIndex
CREATE INDEX "retail_gateway_nodes_load_balancer_id_idx" ON "retail_gateway_nodes"("load_balancer_id");

-- CreateIndex
CREATE INDEX "retail_load_balancers_company_id_idx" ON "retail_load_balancers"("company_id");

-- CreateIndex
CREATE INDEX "it_devices_company_id_idx" ON "it_devices"("company_id");

-- CreateIndex
CREATE INDEX "it_devices_location_id_idx" ON "it_devices"("location_id");

-- CreateIndex
CREATE INDEX "it_devices_owner_id_idx" ON "it_devices"("owner_id");

-- CreateIndex
CREATE INDEX "it_system_health_company_id_idx" ON "it_system_health"("company_id");

-- CreateIndex
CREATE INDEX "it_provisioning_requests_company_id_idx" ON "it_provisioning_requests"("company_id");

-- CreateIndex
CREATE INDEX "it_settings_company_id_idx" ON "it_settings"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "it_settings_company_id_key_key" ON "it_settings"("company_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_settlements_payment_id_key" ON "payment_settlements"("payment_id");

-- CreateIndex
CREATE INDEX "payment_settlements_company_id_idx" ON "payment_settlements"("company_id");

-- CreateIndex
CREATE INDEX "inventory_pools_company_id_idx" ON "inventory_pools"("company_id");

-- CreateIndex
CREATE INDEX "inventory_pools_type_idx" ON "inventory_pools"("type");

-- CreateIndex
CREATE INDEX "inventory_pool_stock_pool_id_idx" ON "inventory_pool_stock"("pool_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_pool_stock_pool_id_product_id_key" ON "inventory_pool_stock"("pool_id", "product_id");

-- CreateIndex
CREATE INDEX "_EcommerceBranchLinks_B_index" ON "_EcommerceBranchLinks"("B");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_location_id_product_id_department_id_key" ON "stock_levels"("location_id", "product_id", "department_id");

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_inventory_pool_id_fkey" FOREIGN KEY ("inventory_pool_id") REFERENCES "inventory_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_connectors" ADD CONSTRAINT "ecommerce_connectors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_connectors" ADD CONSTRAINT "ecommerce_connectors_inventory_pool_id_fkey" FOREIGN KEY ("inventory_pool_id") REFERENCES "inventory_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_department_id_fkey" FOREIGN KEY ("from_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_department_id_fkey" FOREIGN KEY ("to_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_carts" ADD CONSTRAINT "retail_carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_carts" ADD CONSTRAINT "retail_carts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_cart_items" ADD CONSTRAINT "retail_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "retail_carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_cart_items" ADD CONSTRAINT "retail_cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_wishlists" ADD CONSTRAINT "retail_wishlists_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_wishlists" ADD CONSTRAINT "retail_wishlists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_wishlist_items" ADD CONSTRAINT "retail_wishlist_items_wishlist_id_fkey" FOREIGN KEY ("wishlist_id") REFERENCES "retail_wishlists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_wishlist_items" ADD CONSTRAINT "retail_wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_auth" ADD CONSTRAINT "retail_customer_auth_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_sessions" ADD CONSTRAINT "retail_customer_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_sessions" ADD CONSTRAINT "retail_customer_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_gateway_nodes" ADD CONSTRAINT "retail_gateway_nodes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_gateway_nodes" ADD CONSTRAINT "retail_gateway_nodes_load_balancer_id_fkey" FOREIGN KEY ("load_balancer_id") REFERENCES "retail_load_balancers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_load_balancers" ADD CONSTRAINT "retail_load_balancers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_devices" ADD CONSTRAINT "it_devices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_devices" ADD CONSTRAINT "it_devices_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_devices" ADD CONSTRAINT "it_devices_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_system_health" ADD CONSTRAINT "it_system_health_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_provisioning_requests" ADD CONSTRAINT "it_provisioning_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_provisioning_requests" ADD CONSTRAINT "it_provisioning_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_provisioning_requests" ADD CONSTRAINT "it_provisioning_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_settings" ADD CONSTRAINT "it_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_evidence_pack_id_fkey" FOREIGN KEY ("evidence_pack_id") REFERENCES "payment_evidence_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "payment_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_settlements" ADD CONSTRAINT "payment_settlements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_pools" ADD CONSTRAINT "inventory_pools_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_pool_stock" ADD CONSTRAINT "inventory_pool_stock_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "inventory_pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_pool_stock" ADD CONSTRAINT "inventory_pool_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EcommerceBranchLinks" ADD CONSTRAINT "_EcommerceBranchLinks_A_fkey" FOREIGN KEY ("A") REFERENCES "ecommerce_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EcommerceBranchLinks" ADD CONSTRAINT "_EcommerceBranchLinks_B_fkey" FOREIGN KEY ("B") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
