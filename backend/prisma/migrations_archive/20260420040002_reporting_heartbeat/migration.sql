-- CreateTable
CREATE TABLE "sys_report_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL DEFAULT 'AUDIT_TRAIL',
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "file_path" TEXT,
    "error_message" TEXT,
    "last_progress_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_report_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sys_report_jobs_status_idx" ON "sys_report_jobs"("status");

-- CreateIndex
CREATE INDEX "sys_report_jobs_tenant_id_idx" ON "sys_report_jobs"("tenant_id");

-- AddForeignKey
ALTER TABLE "sys_report_jobs" ADD CONSTRAINT "sys_report_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
