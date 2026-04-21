/*
  Warnings:

  - You are about to alter the column `quantity` on the `inventory_movement_requests` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,4)`.
  - You are about to alter the column `on_hand` on the `inventory_pool_stock` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,4)`.
  - You are about to alter the column `reserved` on the `inventory_pool_stock` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,4)`.
  - You are about to alter the column `available` on the `inventory_pool_stock` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,4)`.
  - You are about to alter the column `quantity` on the `retail_cart_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,4)`.

*/
-- AlterTable
ALTER TABLE "inventory_movement_requests" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "inventory_pool_stock" ALTER COLUMN "on_hand" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "reserved" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "available" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "retail_cart_items" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(19,4);
