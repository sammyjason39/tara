-- WhatsApp Agent Integration (Kapso)
-- Adds per-user WhatsApp fields and message/session audit tables

-- Employee WhatsApp fields
ALTER TABLE "employees" ADD COLUMN "whatsapp_number" TEXT;
ALTER TABLE "employees" ADD COLUMN "whatsapp_opted_in" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN "whatsapp_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN "whatsapp_verified_at" TIMESTAMP(3);

-- WhatsApp Message Logs — full audit trail
CREATE TABLE "whatsapp_message_logs" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "wa_message_id" TEXT,
    "wa_status" TEXT NOT NULL DEFAULT 'sent',
    "hermes_agent_id" TEXT,
    "hermes_action_log_id" TEXT,
    "session_id" TEXT,
    "correlation_id" TEXT,
    "metadata" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);

-- WhatsApp Sessions — conversation tracking
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "hermes_agent_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- Indexes for whatsapp_message_logs
CREATE INDEX "whatsapp_message_logs_employee_id_idx" ON "whatsapp_message_logs"("employee_id");
CREATE INDEX "whatsapp_message_logs_direction_idx" ON "whatsapp_message_logs"("direction");
CREATE INDEX "whatsapp_message_logs_wa_message_id_idx" ON "whatsapp_message_logs"("wa_message_id");
CREATE INDEX "whatsapp_message_logs_session_id_idx" ON "whatsapp_message_logs"("session_id");
CREATE INDEX "whatsapp_message_logs_hermes_agent_id_idx" ON "whatsapp_message_logs"("hermes_agent_id");
CREATE INDEX "whatsapp_message_logs_correlation_id_idx" ON "whatsapp_message_logs"("correlation_id");
CREATE INDEX "whatsapp_message_logs_created_at_idx" ON "whatsapp_message_logs"("created_at");
CREATE INDEX "whatsapp_message_logs_employee_id_direction_created_at_idx" ON "whatsapp_message_logs"("employee_id", "direction", "created_at");

-- Indexes for whatsapp_sessions
CREATE INDEX "whatsapp_sessions_employee_id_idx" ON "whatsapp_sessions"("employee_id");
CREATE INDEX "whatsapp_sessions_status_idx" ON "whatsapp_sessions"("status");
CREATE INDEX "whatsapp_sessions_last_activity_at_idx" ON "whatsapp_sessions"("last_activity_at");
CREATE INDEX "whatsapp_sessions_employee_id_status_idx" ON "whatsapp_sessions"("employee_id", "status");

-- Foreign keys
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "whatsapp_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
