-- CreateTable
CREATE TABLE IF NOT EXISTS "status_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overall" TEXT NOT NULL,
    "components" JSONB NOT NULL,

    CONSTRAINT "status_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "status_snapshots_checked_at_idx" ON "status_snapshots"("checked_at");
