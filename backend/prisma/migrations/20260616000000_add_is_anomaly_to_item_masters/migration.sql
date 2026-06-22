-- Add is_anomaly column to item_masters table
ALTER TABLE "item_masters" ADD COLUMN "is_anomaly" BOOLEAN DEFAULT false NOT NULL;