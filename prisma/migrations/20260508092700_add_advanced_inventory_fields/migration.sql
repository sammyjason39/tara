-- AlterTable
ALTER TABLE "item_masters" ADD COLUMN     "discount_rate" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount_type" TEXT NOT NULL DEFAULT 'percentage',
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "pricing_tiers" JSONB,
ADD COLUMN     "selling_price" DECIMAL(15,2) NOT NULL DEFAULT 0;
