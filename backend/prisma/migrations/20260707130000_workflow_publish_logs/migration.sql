-- AlterTable
ALTER TABLE "workflow_definitions" ADD COLUMN "published_graph" JSONB;
ALTER TABLE "workflow_definitions" ADD COLUMN "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "workflow_executions" ADD COLUMN "is_test" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "workflow_executions_is_test_idx" ON "workflow_executions"("is_test");

-- Backfill: only active workflows get a published snapshot
UPDATE "workflow_definitions"
SET "published_graph" = "graph",
    "published_at" = "updated_at"
WHERE "is_active" = true AND "published_graph" IS NULL;
