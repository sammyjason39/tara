-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'FILE', 'QUOTE', 'image', 'system', 'text');

-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('DIRECT', 'GROUP', 'DEPARTMENT', 'LOCATION', 'COMPANY', 'ROLE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('ITEM', 'SERVICE', 'RAW_MATERIAL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "ProcurementMode" AS ENUM ('DIRECT', 'BIDDING');

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_module_statuses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_module_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "requested_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by" TEXT,

    CONSTRAINT "admin_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agentic_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" TEXT,
    "source_event_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agentic_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciation_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "depreciation_exp" DECIMAL(15,2) NOT NULL,
    "accumulated_dep" DECIMAL(15,2) NOT NULL,
    "carrying_value" DECIMAL(15,2) NOT NULL,
    "journal_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_depreciation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_hash_anchors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "anchor_hash" TEXT NOT NULL,
    "anchored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "record_count" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_hash_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "user_agent" TEXT,
    "hash_chain" TEXT,
    "source_module" TEXT,
    "after_state" JSONB,
    "before_state" JSONB,
    "correlation_id" TEXT,
    "idempotency_key" TEXT,
    "original_hash" TEXT,
    "previous_hash" TEXT,
    "recomputed_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "event_reference_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletin_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulletin_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletin_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulletin_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletin_posts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "attachments" JSONB,
    "status" TEXT NOT NULL DEFAULT 'published',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pin_order" INTEGER,
    "scope_id" TEXT,
    "publish_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "scope_type" TEXT NOT NULL DEFAULT 'company',

    CONSTRAINT "bulletin_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletin_reactions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LIKE',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulletin_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletin_reads" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulletin_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "requisition_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "resume_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capex_budgets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "allocated_budget" DECIMAL(15,2) NOT NULL,
    "committed_budget" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "available_budget" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capex_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capex_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "asset_description" TEXT NOT NULL,
    "requested_amount" DECIMAL(15,2) NOT NULL,
    "department" TEXT NOT NULL,
    "project_code" TEXT,
    "requested_by" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "budget_matched" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "current_approval_stage" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capex_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_members" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "muted_until" TIMESTAMP(3),
    "last_read_at" TIMESTAMP(3),
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT,
    "type" "ChatRoomType" NOT NULL DEFAULT 'DIRECT',
    "description" TEXT,
    "avatar_url" TEXT,
    "department_id" TEXT,
    "location_id" TEXT,
    "role_scope" TEXT,
    "created_by" TEXT NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "direct_key" TEXT,
    "last_message_at" TIMESTAMP(3),
    "last_message_id" TEXT,
    "last_message_text" TEXT,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinic_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comms_chat_messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT,
    "type" TEXT DEFAULT 'text',
    "attachments" JSONB,
    "ref_module" TEXT,
    "ref_entity_type" TEXT,
    "ref_entity_id" TEXT,
    "ref_label" TEXT,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "reply_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "event_reference_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comms_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "country" TEXT NOT NULL DEFAULT 'US',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "industry" TEXT NOT NULL DEFAULT 'retail',

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "base_salary" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "pay_frequency" TEXT NOT NULL DEFAULT 'monthly',
    "allowances" JSONB,
    "bonuses" JSONB,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_layers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "remaining_qty" DOUBLE PRECISION NOT NULL,
    "unit_cost" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL DEFAULT 'FIFO',
    "source_event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "total_qty" DOUBLE PRECISION NOT NULL,
    "total_valuation" DECIMAL(15,2) NOT NULL,
    "avg_unit_cost" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "snapshot_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "head_id" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "source_module" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" TEXT,
    "idempotency_key" TEXT,
    "aggregate_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processing_started_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "event_reference_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_connectors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "inventory_pool_id" TEXT,
    "manager_id" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL DEFAULT 'custom',
    "settings" JSONB,

    CONSTRAINT "ecommerce_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_overrides" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "user_id" TEXT,
    "manager_id" TEXT,
    "position" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "employment_type" TEXT NOT NULL DEFAULT 'full_time',
    "base_salary" DECIMAL(15,2),
    "hourly_rate" DECIMAL(15,2),
    "hire_date" TIMESTAMP(3) NOT NULL,
    "termination_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "job_role_id" TEXT,
    "document_metadata" JSONB,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "handler_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farming_sensor_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "sensor_type" TEXT NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farming_sensor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_account_balance_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fiscal_period_id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "balances_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_account_balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_account_balances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fiscal_period_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL DEFAULT 'GLOBAL',
    "location_id" TEXT NOT NULL DEFAULT 'GLOBAL',
    "department_id" TEXT NOT NULL DEFAULT 'GLOBAL',
    "cost_center_id" TEXT NOT NULL DEFAULT 'GLOBAL',
    "project_id" TEXT NOT NULL DEFAULT 'GLOBAL',
    "debit_total" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "credit_total" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "net_balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'IDR',

    CONSTRAINT "finance_account_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNRESOLVED',
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ap_payment_allocations" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "amount_allocated" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ap_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ar_credit_memos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "credit_amount" DECIMAL(19,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ar_credit_memos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ar_customer_credit_balances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "balance" DECIMAL(19,4) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ar_customer_credit_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ar_customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "credit_limit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ar_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ar_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unit_price" DECIMAL(19,4) NOT NULL,
    "total" DECIMAL(19,4) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ar_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ar_invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "issue_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "total_amount" DECIMAL(19,4) NOT NULL,
    "outstanding_amount" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workflow_request_id" TEXT,
    "idempotency_key" TEXT,

    CONSTRAINT "finance_ar_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ar_payment_allocations" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount_allocated" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivableId" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ar_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ar_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference" TEXT,
    "payment_reference" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ar_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_asset_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "depreciation_method" TEXT NOT NULL,
    "useful_life_years" INTEGER NOT NULL,
    "asset_account_ref" TEXT,
    "depreciation_account_ref" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_bank_statements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "gl_account_id" TEXT,
    "statement_date" TIMESTAMP(3) NOT NULL,
    "opening_balance" DECIMAL(19,4) NOT NULL,
    "closing_balance" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_bank_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "statement_id" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_budget_actuals" (
    "id" TEXT NOT NULL,
    "budget_line_id" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "as_of_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,
    "departmentId" TEXT,
    "budgetScenarioId" TEXT,
    "chartOfAccountId" TEXT,
    "fiscalPeriodId" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_budget_actuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_budget_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "cost_center_id" TEXT,
    "amount" DECIMAL(19,4) NOT NULL,
    "period_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,
    "departmentId" TEXT,
    "chartOfAccountId" TEXT,
    "fiscalPeriodId" TEXT,

    CONSTRAINT "finance_budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_certifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "certification_hash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_chart_of_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_expense_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "hard_limit" DECIMAL(19,4) NOT NULL,
    "soft_limit" DECIMAL(19,4) NOT NULL,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_expense_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_fiscal_periods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_insight_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "snapshot_sequence" INTEGER NOT NULL,
    "forecast_hash" TEXT NOT NULL,
    "insight_hash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_insight_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_insights" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "trend" TEXT NOT NULL,
    "actionable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_journal_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fiscal_period_id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "description" TEXT,
    "posting_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "previous_hash" TEXT,
    "entry_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" TEXT,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "journal_type" TEXT NOT NULL DEFAULT 'NORMAL',
    "ledger_sequence" BIGINT,
    "source_event_id" TEXT,
    "memo" TEXT,

    CONSTRAINT "finance_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_journal_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "description" TEXT,
    "side" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "debit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "branch_id" TEXT,
    "location_id" TEXT,
    "department_id" TEXT,
    "cost_center_id" TEXT,
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_journal_reversals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "original_journal_id" TEXT NOT NULL,
    "reversal_journal_id" TEXT NOT NULL,
    "reversal_reason" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_journal_reversals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ledger_event_log" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "source_event_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sequence_key" TEXT,
    "sequence_number" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "company_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ledger_event_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ledger_event_log_archive" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "source_event_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sequence_key" TEXT,
    "sequence_number" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ledger_event_log_archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ledger_hash_anchors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "anchor_date" TIMESTAMP(3) NOT NULL,
    "final_journal_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ledger_hash_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ledger_idempotency" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_event_id" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ledger_idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ledger_posting_lines" (
    "id" TEXT NOT NULL,
    "ledger_posting_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "branch_id" TEXT,
    "location_id" TEXT,
    "department_id" TEXT,
    "cost_center_id" TEXT,
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "dimension_branch_id" TEXT,
    "dimension_channel_id" TEXT,
    "dimension_cost_center_id" TEXT,
    "dimension_department_id" TEXT,
    "dimension_project_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ledger_posting_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ledger_posting_rule_lines" (
    "id" TEXT NOT NULL,
    "posting_rule_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "side" TEXT NOT NULL DEFAULT 'DEBIT',
    "amount_expression" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ledger_posting_rule_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ledger_posting_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ledger_posting_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ledger_postings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "sequence_key" TEXT,
    "sequence_number" INTEGER,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_ledger_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "threshold" DECIMAL(15,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_recon_matches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bank_transaction_id" TEXT NOT NULL,
    "ledger_journal_id" TEXT,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "match_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_recon_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fiscal_year_start_month" INTEGER NOT NULL DEFAULT 1,
    "fiscal_year_start_day" INTEGER NOT NULL DEFAULT 1,
    "auto_close_period" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_system_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "system_code" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_system_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_tax_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "country" TEXT NOT NULL DEFAULT 'ID',
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_tax_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_tax_rates" (
    "id" TEXT NOT NULL,
    "tax_rule_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "is_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "account_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_tax_rules" (
    "id" TEXT NOT NULL,
    "tax_config_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transaction_taxes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "tax_rate_id" TEXT NOT NULL,
    "base_amount" DECIMAL(19,4) NOT NULL,
    "tax_amount" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_transaction_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "asset_class" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "acquisition_date" TIMESTAMP(3) NOT NULL,
    "acquisition_cost" DECIMAL(15,2) NOT NULL,
    "useful_life_years" INTEGER NOT NULL,
    "depreciation_method" TEXT NOT NULL,
    "residual_value" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL,
    "capitalization_date" TIMESTAMP(3),
    "accumulated_depreciation" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "carrying_value" DECIMAL(15,2) NOT NULL,
    "revaluation_reserve" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "capex_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_ingredients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fnb_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_recipes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_cost" DECIMAL(15,2) NOT NULL,
    "suggested_price" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fnb_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_attendance_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "check_in" JSONB,
    "check_out" JSONB,
    "status" TEXT NOT NULL DEFAULT 'present',
    "type" TEXT NOT NULL DEFAULT 'web',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "shift_id" TEXT,
    "work_duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "work_schedule_id" TEXT,
    "work_shift_id" TEXT,
    "event_reference_id" TEXT,

    CONSTRAINT "hr_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_benefit_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "employer_contribution" DECIMAL(15,2),
    "employee_contribution" DECIMAL(15,2),
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "hr_benefit_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_budget_scenarios" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total_budget" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hr_budget_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_career_paths" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_position_id" TEXT NOT NULL,
    "to_position_id" TEXT NOT NULL,
    "requirement_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_career_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "department_id" TEXT,
    "title" TEXT,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "owner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "deleted_at" TIMESTAMP(3),
    "description" TEXT,
    "subject" TEXT,
    "metadata" JSONB,

    CONSTRAINT "hr_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_compliance_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_number" TEXT,
    "file_url" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_compliance_modules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_compliance_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_compliance_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payroll_run_id" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "summary" JSONB NOT NULL,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_compliance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_context_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "time_window" TEXT NOT NULL,
    "aggregated_values" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_context_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee_benefits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "enrollment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "coverage_amount" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_employee_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee_skills" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "proficiency" INTEGER NOT NULL DEFAULT 1,
    "verification_status" TEXT NOT NULL DEFAULT 'SELF_ASSESSED',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_employee_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_exchange_rates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "rate" DECIMAL(15,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_headcount_plans" (
    "id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "position_title" TEXT NOT NULL,
    "target_headcount" INTEGER NOT NULL,
    "projected_salary" DECIMAL(15,2) NOT NULL,
    "planned_hire_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "hr_headcount_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_holidays" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hr_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_insights" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_mentorship_pairs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "focus_skills" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "program_name" TEXT,

    CONSTRAINT "hr_mentorship_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_payroll_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total_employees" INTEGER NOT NULL DEFAULT 0,
    "total_gross_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_net_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "base_currency" TEXT NOT NULL DEFAULT 'USD',
    "pay_date" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_disbursement_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payroll_run_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "bank_file_name" TEXT,
    "disbursed_at" TIMESTAMP(3),
    "disbursed_by" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_disbursement_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_performance_cycles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hr_performance_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_performance_goals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_date" TIMESTAMP(3) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_performance_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_position_skills" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "min_proficiency" INTEGER NOT NULL DEFAULT 1,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importance" TEXT NOT NULL DEFAULT 'medium',

    CONSTRAINT "hr_position_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_program_skills" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "proficiency_gain" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_program_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_recommendation_feedbacks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "action_taken" TEXT NOT NULL,
    "outcome" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_recommendation_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_recommendations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "insight_id" TEXT,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence_score" DOUBLE PRECISION,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_skills" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_succession_candidates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "readiness" TEXT NOT NULL DEFAULT 'EMERGENCY',
    "readiness_score" INTEGER NOT NULL DEFAULT 0,
    "risk_of_loss" TEXT NOT NULL DEFAULT 'LOW',
    "impact_of_loss" TEXT NOT NULL DEFAULT 'MEDIUM',
    "skill_gaps" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "candidate_id" TEXT NOT NULL,

    CONSTRAINT "hr_succession_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_succession_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "is_critical" BOOLEAN NOT NULL DEFAULT true,
    "strategy" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_succession_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_system_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_system_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_system_metrics" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_talent_leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LINKEDIN',
    "external_profile_url" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "headline" TEXT,
    "skills" JSONB,
    "lead_score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'LEAD',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_talent_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_threshold_audits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "old_value" DOUBLE PRECISION NOT NULL,
    "new_value" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_threshold_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_work_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location_id" TEXT,
    "metadata" JSONB,
    "name" TEXT,

    CONSTRAINT "hr_work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_work_shifts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location_id" TEXT,
    "metadata" JSONB,
    "notes" TEXT,
    "role_id" TEXT,

    CONSTRAINT "hr_work_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "interviewer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "requested_delta" DECIMAL(19,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "department_id" TEXT,
    "location_id" TEXT NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "entity_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_audit_cycles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_code" TEXT NOT NULL,
    "department_code" TEXT,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "expected_value" DOUBLE PRECISION,
    "counted_value" DOUBLE PRECISION,
    "variance_value" DOUBLE PRECISION,
    "opened_by" TEXT NOT NULL,
    "closed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_audit_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_integration_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SYNCED',
    "event_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_integration_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "from_location_id" TEXT NOT NULL,
    "to_location_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transfers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_location_id" TEXT NOT NULL,
    "to_location_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "picked_by" TEXT,
    "picked_at" TIMESTAMP(3),
    "shipped_by" TEXT,
    "shipped_at" TIMESTAMP(3),
    "tracking_number" TEXT,
    "received_by" TEXT,
    "received_at" TIMESTAMP(3),
    "transfer_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id")
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pool_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_pools" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'shared',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inventory_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_subledger_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_event_id" TEXT NOT NULL,
    "entry_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "is_system_generated" BOOLEAN NOT NULL DEFAULT true,
    "reversed_entry_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "inventory_subledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_device_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "it_device_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_devices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "owner_id" TEXT,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connection" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "it_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_provisioning_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "it_provisioning_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "it_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_system_health" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "latency_ms" INTEGER NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "it_system_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_masters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "base_price" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.11,
    "image_url" TEXT,
    "module_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "type" "ItemType" NOT NULL DEFAULT 'ITEM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "department_id" TEXT,

    CONSTRAINT "item_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_requisitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "department_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openings" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "job_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "base_salary_min" DECIMAL(15,2),
    "base_salary_max" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "module_type" TEXT NOT NULL,
    "labels" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "label_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approval_id" TEXT,
    "department_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "country" TEXT,
    "currency" TEXT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'internal',
    "display_name" TEXT,
    "provider" TEXT,
    "smtp_config" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mail_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_folder_items" (
    "id" TEXT NOT NULL,
    "folder_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_folder_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_folders" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_labels" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "from_account_id" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_addresses" JSONB NOT NULL,
    "cc_addresses" JSONB,
    "bcc_addresses" JSONB,
    "subject" TEXT NOT NULL,
    "body_html" TEXT,
    "body_text" TEXT,
    "attachments" JSONB,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "event_reference_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_threads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[],
    "last_sync_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_attribution" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "opportunity_id" TEXT,
    "revenue_attributed" DECIMAL(15,2) NOT NULL,
    "spend" DECIMAL(15,2) NOT NULL,
    "roi_percent" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_attribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_audit_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "channel_mix" TEXT[],
    "owner_id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "budget" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "audience" TEXT NOT NULL,
    "ai_recommendation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_executions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "leads_generated" INTEGER NOT NULL DEFAULT 0,
    "spend" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "source" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "industry" TEXT,
    "employee_band" TEXT,
    "dedup_key" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "intent" TEXT NOT NULL DEFAULT 'LOW',
    "status" TEXT NOT NULL DEFAULT 'SCORED',
    "qualification_reason" TEXT,
    "sales_handoff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_workflows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "steps" JSONB NOT NULL,
    "ai_suggestion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'industry',
    "icon_url" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_license_logs" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_license_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_licenses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_code" TEXT NOT NULL,
    "license_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "plan_type" TEXT NOT NULL DEFAULT 'monthly',
    "max_seats" INTEGER,
    "used_seats" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "payment_ref" TEXT,
    "issued_by" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "revoke_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_sources" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "balance" DECIMAL(15,2) NOT NULL,
    "pending_settlement" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "provider" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_reference_id" TEXT,
    "last_retry_at" TIMESTAMP(3),
    "priority" TEXT DEFAULT 'NORMAL',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "workflow_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workflow_request_id" TEXT,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_audit_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_chargebacks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_chargebacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_device_pools" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "primary_device_id" TEXT NOT NULL,
    "fallback_device_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_device_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_disputes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPENED',
    "opened_by" TEXT NOT NULL,
    "evidence" TEXT[],
    "provider_case_id" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_evidence_packs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "provider_proof" TEXT NOT NULL,
    "approval_signatures" TEXT[],
    "checksum" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_evidence_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_pos_devices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "device_code" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "provider_id" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pos_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_providers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channels" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'HEALTHY',
    "max_amount_per_txn" DECIMAL(15,2) NOT NULL,
    "settlement_sla_hours" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "last_heartbeat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_refunds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FULL',
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "provider_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_retry_attempts" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "provider_id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "error_message" TEXT,
    "retried_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_retry_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_routing_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priorities" TEXT[],
    "fallback_providers" TEXT[],
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "exponential_backoff_seconds" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_routing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_settlements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "provider_reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmed_at" TIMESTAMP(3),
    "retry_attempts" JSONB,
    "ledger_sync_triggered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "external_reference" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "destination" TEXT NOT NULL,
    "source" TEXT,
    "channel" TEXT NOT NULL,
    "provider_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUEST_CREATED',
    "ledger_sync_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidence_pack_id" TEXT,
    "ledger_sync_triggered_at" TIMESTAMP(3),
    "settlement_id" TEXT,
    "department_id" TEXT,
    "extra_info" JSONB,
    "purpose" TEXT,
    "workflow_request_id" TEXT,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_adjustment_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payroll_line_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_adjustment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_fixed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payroll_run_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "gross_pay" DECIMAL(15,2) NOT NULL,
    "net_pay" DECIMAL(15,2) NOT NULL,
    "adjustments" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "bank_name" TEXT,
    "bank_account_no" TEXT,
    "tax_id" TEXT,
    "social_security_no" TEXT,
    "payment_method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rating" INTEGER,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_devices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mac_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "budgeted_salary" DECIMAL(15,2),
    "reports_to_position_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "job_post_metadata" JSONB,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sku_id" TEXT NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "logic" TEXT NOT NULL,
    "floor_price" DECIMAL(15,2),
    "ceiling_price" DECIMAL(15,2),
    "conditions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_audit_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_contracts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requisition_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "legal_reviewed_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "signed_by_supplier" BOOLEAN NOT NULL DEFAULT false,
    "signed_by_proc_hod" BOOLEAN NOT NULL DEFAULT false,
    "signed_by_finance_hod" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "attachment_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_draft_pos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requisition_id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_branch_id" TEXT NOT NULL,
    "contract_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "line_items" JSONB NOT NULL,
    "quoted_total" DECIMAL(15,2) NOT NULL,
    "quote_reference" TEXT,
    "quote_notes" TEXT,
    "quote_attachment" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_draft_pos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_final_pos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requisition_id" TEXT NOT NULL,
    "draft_po_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_branch_id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RELEASED',
    "total_amount" DECIMAL(15,2) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_delivery_date" TIMESTAMP(3),
    "finance_commitment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "procurement_final_pos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_goods_receipt_syncs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "final_po_id" TEXT NOT NULL,
    "requisition_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_branch_id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "expected_delivery_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING_RECEIPT',
    "issue_count" INTEGER NOT NULL DEFAULT 0,
    "invoice_mismatch" BOOLEAN NOT NULL DEFAULT false,
    "requested_by" TEXT NOT NULL,
    "synced_by" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_goods_receipt_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_legal_handoffs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requisition_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "notes" TEXT,
    "workflow_request_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_LEGAL_ACK',
    "acknowledged_by" TEXT,
    "accepted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_legal_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_rating_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_branch_id" TEXT NOT NULL,
    "supplier_score" INTEGER NOT NULL,
    "product_score" INTEGER NOT NULL,
    "risk_tier" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_rating_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_receipts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "final_po_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_branch_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_on_time" BOOLEAN NOT NULL DEFAULT true,
    "quantity_accuracy" INTEGER NOT NULL DEFAULT 100,
    "quality_score" INTEGER NOT NULL DEFAULT 100,
    "issue_count" INTEGER NOT NULL DEFAULT 0,
    "invoice_mismatch" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_requisitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "budget_class" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvals" JSONB,
    "supplier_id" TEXT,
    "supplier_branch_id" TEXT,
    "contract_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_risk_signals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "entity_id" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_risk_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_sourcing_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requisition_id" TEXT,
    "final_po_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "bid_deadline" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_sourcing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_supplier_access_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_branch_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "portal_scope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "approved_by" TEXT,
    "provisioned_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_supplier_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_projections" (
    "id" TEXT NOT NULL,
    "item_master_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT,
    "module_type" TEXT NOT NULL,
    "custom_name" TEXT,
    "custom_description" TEXT,
    "price" DECIMAL(15,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "aging_bucket" TEXT,
    "workflow_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_carts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_channels" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sync_frequency" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adapter_type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "credentials" JSONB,
    "integration_category" TEXT NOT NULL DEFAULT 'PRESET',
    "webhook_url" TEXT,

    CONSTRAINT "retail_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_customer_auth" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_at" TIMESTAMP(3),
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_customer_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_customer_sessions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'regular',
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "retail_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_gateway_nodes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "load_balancer_id" TEXT,
    "node_name" TEXT NOT NULL,
    "ip_address" TEXT,
    "port" INTEGER NOT NULL DEFAULT 3000,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "health_score" INTEGER NOT NULL DEFAULT 100,
    "last_heartbeat" TIMESTAMP(3),
    "version" TEXT,
    "region" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_gateway_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_load_balancers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "virtual_ip" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'ROUND_ROBIN',
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_load_balancers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "total_price" DECIMAL(15,2) NOT NULL,
    "unit_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tenant_id" TEXT NOT NULL,
    "returned_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "device_id" TEXT,
    "cashier_id" TEXT,
    "customer_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "subtotal" DECIMAL(15,2) NOT NULL,
    "tax" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_promotions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "target" TEXT NOT NULL DEFAULT 'all',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_shifts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "opening_cash" DECIMAL(15,2) NOT NULL,
    "closing_cash" DECIMAL(15,2),
    "expected_cash" DECIMAL(15,2),
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actual_cash" DECIMAL(15,2),
    "reconciliation_reason" TEXT,
    "variance" DECIMAL(15,2),

    CONSTRAINT "retail_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_wishlist_items" (
    "id" TEXT NOT NULL,
    "wishlist_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retail_wishlists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retail_wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_audit_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MARKETING',
    "owner_id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "potential_value" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "sla_due_at" TIMESTAMP(3) NOT NULL,
    "first_response_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_opportunities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "account_name" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "expected_close_date" TIMESTAMP(3) NOT NULL,
    "health" TEXT NOT NULL DEFAULT 'MEDIUM_RISK',
    "next_action" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "quote_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "inventory_check" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "finance_invoice_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quotes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(15,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "approval_by" TEXT,
    "approval_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "opportunity_id" TEXT,
    "lead_id" TEXT,
    "title" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "due_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_timeline_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'NOTE',
    "direction" TEXT NOT NULL DEFAULT 'INTERNAL',
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL,
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_swap_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_swap_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "break_duration" INTEGER NOT NULL DEFAULT 0,
    "flexible_window" INTEGER NOT NULL DEFAULT 0,
    "work_days" INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "on_hand" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "available" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "min_buffer" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "max_capacity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "last_stock_take_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "department_id" TEXT,
    "in_transit" DECIMAL(19,4) NOT NULL DEFAULT 0,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "from_location_id" TEXT,
    "to_location_id" TEXT,
    "quantity" DECIMAL(19,4) NOT NULL,
    "type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from_department_id" TEXT,
    "to_department_id" TEXT,
    "reference_type" TEXT,
    "department_id" TEXT,
    "location_id" TEXT NOT NULL,
    "transfer_group_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "reservation_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference_id" TEXT NOT NULL,
    "reference_type" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "reserved" DOUBLE PRECISION NOT NULL,
    "available" DOUBLE PRECISION NOT NULL,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inTransit" DOUBLE PRECISION NOT NULL,
    "onHand" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "manager_id" TEXT,
    "email" TEXT,
    "inventory_pool_id" TEXT,
    "operating_hours" JSONB,
    "phone" TEXT,
    "settings" JSONB,
    "timezone" TEXT DEFAULT 'Asia/Jakarta',
    "country" TEXT,
    "currency" TEXT,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "lead_time_days" INTEGER NOT NULL DEFAULT 0,
    "local_rating" INTEGER NOT NULL DEFAULT 0,
    "risk_tier" TEXT NOT NULL DEFAULT 'LOW',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "contact_email" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "full_address" TEXT,

    CONSTRAINT "supplier_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_masters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tax_id" TEXT,
    "compliance_status" TEXT NOT NULL DEFAULT 'PENDING',
    "global_rating" INTEGER NOT NULL DEFAULT 0,
    "risk_tier" TEXT NOT NULL DEFAULT 'LOW',
    "categories" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "address" TEXT,
    "contact_email" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "website" TEXT,

    CONSTRAINT "supplier_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_portal_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_branch_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "related_entity_id" TEXT,
    "content" TEXT NOT NULL,
    "attachment_name" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_portal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "quality_score" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_anchors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "request_hash" TEXT,
    "response_snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sys_idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_outbox_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_retry_at" TIMESTAMP(3),

    CONSTRAINT "sys_outbox_events_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "module" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "error_stack" TEXT,
    "request_id" TEXT,
    "user_id" TEXT,
    "ip_address" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "procurement_mode" "ProcurementMode" NOT NULL DEFAULT 'DIRECT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "assigned_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_programs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_transfers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "from_source_id" TEXT NOT NULL,
    "to_source_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar_url" TEXT,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_audit_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT,
    "notes" TEXT,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_definition_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "current_state" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failure_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "steps_executed" JSONB,
    "root_event_id" TEXT,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "maker_dept" TEXT NOT NULL,
    "destination_dept" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT,
    "last_action" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "steps" JSONB,
    "route" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_overrides" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_job_queue" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "shift_summary_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_job_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_audit_master" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "auditor_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_audit_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_audit_lines" (
    "id" TEXT NOT NULL,
    "master_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "expected_qty" DECIMAL(19,4) NOT NULL,
    "actual_qty" DECIMAL(19,4) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "stock_audit_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EcommerceBranchLinks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EcommerceBranchLinks_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MessageLabels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MessageLabels_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "accounting_periods_status_idx" ON "accounting_periods"("status");

-- CreateIndex
CREATE INDEX "accounting_periods_tenant_id_idx" ON "accounting_periods"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_tenant_id_name_key" ON "accounting_periods"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_module_statuses_tenant_id_module_key_key" ON "admin_module_statuses"("tenant_id", "module_key");

-- CreateIndex
CREATE INDEX "agentic_events_tenant_id_entity_id_idx" ON "agentic_events"("tenant_id", "entity_id");

-- CreateIndex
CREATE INDEX "agentic_events_tenant_id_event_type_status_idx" ON "agentic_events"("tenant_id", "event_type", "status");

-- CreateIndex
CREATE INDEX "asset_depreciation_entries_tenant_id_asset_id_idx" ON "asset_depreciation_entries"("tenant_id", "asset_id");

-- CreateIndex
CREATE INDEX "asset_events_tenant_id_asset_id_idx" ON "asset_events"("tenant_id", "asset_id");

-- CreateIndex
CREATE INDEX "audit_hash_anchors_anchored_at_idx" ON "audit_hash_anchors"("anchored_at");

-- CreateIndex
CREATE INDEX "audit_hash_anchors_tenant_id_idx" ON "audit_hash_anchors"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_source_module_idx" ON "audit_logs"("tenant_id", "source_module");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_tenant_id_idempotency_key_key" ON "audit_logs"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "bulletin_categories_tenant_id_code_key" ON "bulletin_categories"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "bulletin_comments_tenant_id_idx" ON "bulletin_comments"("tenant_id");

-- CreateIndex
CREATE INDEX "bulletin_posts_status_idx" ON "bulletin_posts"("status");

-- CreateIndex
CREATE INDEX "bulletin_posts_tenant_id_idx" ON "bulletin_posts"("tenant_id");

-- CreateIndex
CREATE INDEX "bulletin_reactions_tenant_id_idx" ON "bulletin_reactions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulletin_reactions_post_id_user_id_type_key" ON "bulletin_reactions"("post_id", "user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "bulletin_reads_post_id_user_id_key" ON "bulletin_reads"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "candidates_tenant_id_idx" ON "candidates"("tenant_id");

-- CreateIndex
CREATE INDEX "capex_budgets_tenant_id_idx" ON "capex_budgets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "capex_budgets_tenant_id_department_period_key" ON "capex_budgets"("tenant_id", "department", "period");

-- CreateIndex
CREATE INDEX "capex_requests_tenant_id_idx" ON "capex_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_members_tenant_id_idx" ON "chat_members"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_members_user_id_idx" ON "chat_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_members_room_id_user_id_key" ON "chat_members"("room_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_reactions_message_id_user_id_emoji_key" ON "chat_reactions"("message_id", "user_id", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_direct_key_key" ON "chat_rooms"("direct_key");

-- CreateIndex
CREATE INDEX "chat_rooms_direct_key_idx" ON "chat_rooms"("direct_key");

-- CreateIndex
CREATE INDEX "chat_rooms_tenant_id_type_idx" ON "chat_rooms"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "chat_rooms_tenant_id_updated_at_idx" ON "chat_rooms"("tenant_id", "updated_at");

-- CreateIndex
CREATE INDEX "clinic_reservations_tenant_id_patient_id_idx" ON "clinic_reservations"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "clinic_reservations_tenant_id_resource_id_start_time_idx" ON "clinic_reservations"("tenant_id", "resource_id", "start_time");

-- CreateIndex
CREATE INDEX "comms_chat_messages_room_id_created_at_idx" ON "comms_chat_messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "comms_chat_messages_tenant_id_idx" ON "comms_chat_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "comms_chat_messages_tenant_id_ref_module_ref_entity_type_re_idx" ON "comms_chat_messages"("tenant_id", "ref_module", "ref_entity_type", "ref_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE UNIQUE INDEX "compensations_employee_id_key" ON "compensations"("employee_id");

-- CreateIndex
CREATE INDEX "compensations_tenant_id_idx" ON "compensations"("tenant_id");

-- CreateIndex
CREATE INDEX "contracts_employee_id_idx" ON "contracts"("employee_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_tenant_id_idx" ON "contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "cost_layers_tenant_id_sku_id_location_id_idx" ON "cost_layers"("tenant_id", "sku_id", "location_id");

-- CreateIndex
CREATE INDEX "cost_snapshots_tenant_id_sku_id_location_id_idx" ON "cost_snapshots"("tenant_id", "sku_id", "location_id");

-- CreateIndex
CREATE INDEX "departments_status_idx" ON "departments"("status");

-- CreateIndex
CREATE INDEX "departments_tenant_id_idx" ON "departments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_code_key" ON "departments"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "domain_events_aggregate_id_idx" ON "domain_events"("aggregate_id");

-- CreateIndex
CREATE INDEX "domain_events_correlation_id_idx" ON "domain_events"("correlation_id");

-- CreateIndex
CREATE INDEX "domain_events_entity_id_idx" ON "domain_events"("entity_id");

-- CreateIndex
CREATE INDEX "domain_events_event_type_idx" ON "domain_events"("event_type");

-- CreateIndex
CREATE INDEX "domain_events_tenant_id_idx" ON "domain_events"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "domain_events_tenant_id_idempotency_key_key" ON "domain_events"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_connectors_api_key_key" ON "ecommerce_connectors"("api_key");

-- CreateIndex
CREATE INDEX "ecommerce_connectors_api_key_idx" ON "ecommerce_connectors"("api_key");

-- CreateIndex
CREATE INDEX "ecommerce_connectors_status_idx" ON "ecommerce_connectors"("status");

-- CreateIndex
CREATE INDEX "ecommerce_connectors_tenant_id_idx" ON "ecommerce_connectors"("tenant_id");

-- CreateIndex
CREATE INDEX "employees_tenant_id_idx" ON "employees"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_email_key" ON "employees"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_employee_code_key" ON "employees"("tenant_id", "employee_code");

-- CreateIndex
CREATE INDEX "event_deliveries_tenant_id_status_next_retry_at_idx" ON "event_deliveries"("tenant_id", "status", "next_retry_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_deliveries_tenant_id_event_id_handler_name_key" ON "event_deliveries"("tenant_id", "event_id", "handler_name");

-- CreateIndex
CREATE INDEX "farming_sensor_logs_tenant_id_sensor_id_timestamp_idx" ON "farming_sensor_logs"("tenant_id", "sensor_id", "timestamp");

-- CreateIndex
CREATE INDEX "finance_account_balance_snapshots_tenant_id_snapshot_date_idx" ON "finance_account_balance_snapshots"("tenant_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "finance_account_balances_tenant_id_created_at_idx" ON "finance_account_balances"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "finance_account_balances_tenant_id_fiscal_period_id_account_key" ON "finance_account_balances"("tenant_id", "fiscal_period_id", "account_id", "currency", "branch_id", "location_id", "department_id", "cost_center_id", "project_id");

-- CreateIndex
CREATE INDEX "finance_alerts_status_idx" ON "finance_alerts"("status");

-- CreateIndex
CREATE INDEX "finance_alerts_tenant_id_idx" ON "finance_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_ar_credit_memos_tenant_id_customer_id_idx" ON "finance_ar_credit_memos"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_ar_customer_credit_balances_tenant_id_customer_id_key" ON "finance_ar_customer_credit_balances"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "finance_ar_customers_tenant_id_idx" ON "finance_ar_customers"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_ar_invoices_tenant_id_customer_id_idx" ON "finance_ar_invoices"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_ar_invoices_tenant_id_idempotency_key_key" ON "finance_ar_invoices"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "finance_ar_invoices_tenant_id_invoice_number_key" ON "finance_ar_invoices"("tenant_id", "invoice_number");

-- CreateIndex
CREATE INDEX "finance_ar_payments_tenant_id_created_at_idx" ON "finance_ar_payments"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "finance_ar_payments_tenant_id_customer_id_idx" ON "finance_ar_payments"("tenant_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_ar_payments_tenant_id_idempotency_key_key" ON "finance_ar_payments"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "finance_asset_categories_tenant_id_code_key" ON "finance_asset_categories"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "finance_certifications_tenant_id_snapshot_id_idx" ON "finance_certifications"("tenant_id", "snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_certifications_tenant_id_snapshot_id_key" ON "finance_certifications"("tenant_id", "snapshot_id");

-- CreateIndex
CREATE INDEX "finance_chart_of_accounts_tenant_id_idx" ON "finance_chart_of_accounts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_chart_of_accounts_tenant_id_code_key" ON "finance_chart_of_accounts"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "finance_documents_tenant_id_idx" ON "finance_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_fiscal_periods_tenant_id_idx" ON "finance_fiscal_periods"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_insight_snapshots_forecast_hash_idx" ON "finance_insight_snapshots"("forecast_hash");

-- CreateIndex
CREATE INDEX "finance_insight_snapshots_tenant_id_company_id_snapshot_seq_idx" ON "finance_insight_snapshots"("tenant_id", "company_id", "snapshot_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "finance_insight_snapshots_tenant_id_company_id_snapshot_seq_key" ON "finance_insight_snapshots"("tenant_id", "company_id", "snapshot_sequence", "forecast_hash");

-- CreateIndex
CREATE INDEX "finance_insights_tenant_id_idx" ON "finance_insights"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_journal_entries_ref_key" ON "finance_journal_entries"("ref");

-- CreateIndex
CREATE INDEX "finance_journal_entries_tenant_id_created_at_idx" ON "finance_journal_entries"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "finance_journal_entries_tenant_id_fiscal_period_id_idx" ON "finance_journal_entries"("tenant_id", "fiscal_period_id");

-- CreateIndex
CREATE INDEX "finance_journal_entries_tenant_id_status_idx" ON "finance_journal_entries"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "finance_journal_entries_tenant_id_ref_key" ON "finance_journal_entries"("tenant_id", "ref");

-- CreateIndex
CREATE INDEX "finance_journal_lines_tenant_id_created_at_idx" ON "finance_journal_lines"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "finance_journal_lines_tenant_id_journal_entry_id_idx" ON "finance_journal_lines"("tenant_id", "journal_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_journal_reversals_tenant_id_original_journal_id_key" ON "finance_journal_reversals"("tenant_id", "original_journal_id");

-- CreateIndex
CREATE INDEX "finance_ledger_event_log_processed_at_idx" ON "finance_ledger_event_log"("processed_at");

-- CreateIndex
CREATE INDEX "finance_ledger_event_log_tenant_id_created_at_idx" ON "finance_ledger_event_log"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "finance_ledger_event_log_tenant_id_company_id_source_event__key" ON "finance_ledger_event_log"("tenant_id", "company_id", "source_event_id");

-- CreateIndex
CREATE INDEX "finance_ledger_event_log_archive_tenant_id_created_at_idx" ON "finance_ledger_event_log_archive"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "finance_ledger_hash_anchors_tenant_id_anchor_date_key" ON "finance_ledger_hash_anchors"("tenant_id", "anchor_date");

-- CreateIndex
CREATE UNIQUE INDEX "finance_ledger_idempotency_tenant_id_company_id_source_even_key" ON "finance_ledger_idempotency"("tenant_id", "company_id", "source_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_ledger_posting_rules_tenant_id_company_id_event_typ_key" ON "finance_ledger_posting_rules"("tenant_id", "company_id", "event_type");

-- CreateIndex
CREATE INDEX "finance_ledger_postings_tenant_id_sequence_key_sequence_num_idx" ON "finance_ledger_postings"("tenant_id", "sequence_key", "sequence_number");

-- CreateIndex
CREATE INDEX "finance_policies_tenant_id_idx" ON "finance_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_recon_matches_bank_transaction_id_idx" ON "finance_recon_matches"("bank_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_recon_matches_tenant_id_bank_transaction_id_ledger__key" ON "finance_recon_matches"("tenant_id", "bank_transaction_id", "ledger_journal_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_settings_tenant_id_key" ON "finance_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "finance_system_mappings_tenant_id_idx" ON "finance_system_mappings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_system_mappings_tenant_id_system_code_key" ON "finance_system_mappings"("tenant_id", "system_code");

-- CreateIndex
CREATE UNIQUE INDEX "finance_tax_configs_tenant_id_branch_id_key" ON "finance_tax_configs"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "fixed_assets_tenant_id_idx" ON "fixed_assets"("tenant_id");

-- CreateIndex
CREATE INDEX "fnb_ingredients_tenant_id_recipe_id_idx" ON "fnb_ingredients"("tenant_id", "recipe_id");

-- CreateIndex
CREATE INDEX "fnb_recipes_tenant_id_idx" ON "fnb_recipes"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_attendance_records_date_idx" ON "hr_attendance_records"("date");

-- CreateIndex
CREATE INDEX "hr_attendance_records_employee_id_idx" ON "hr_attendance_records"("employee_id");

-- CreateIndex
CREATE INDEX "hr_attendance_records_tenant_id_idx" ON "hr_attendance_records"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_attendance_records_work_schedule_id_idx" ON "hr_attendance_records"("work_schedule_id");

-- CreateIndex
CREATE INDEX "hr_attendance_records_work_shift_id_idx" ON "hr_attendance_records"("work_shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_attendance_records_tenant_id_employee_id_date_key" ON "hr_attendance_records"("tenant_id", "employee_id", "date");

-- CreateIndex
CREATE INDEX "hr_benefit_plans_tenant_id_idx" ON "hr_benefit_plans"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_budget_scenarios_tenant_id_idx" ON "hr_budget_scenarios"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_career_paths_tenant_id_idx" ON "hr_career_paths"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_cases_employee_id_idx" ON "hr_cases"("employee_id");

-- CreateIndex
CREATE INDEX "hr_cases_tenant_id_idx" ON "hr_cases"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_compliance_documents_employee_id_idx" ON "hr_compliance_documents"("employee_id");

-- CreateIndex
CREATE INDEX "hr_compliance_documents_tenant_id_idx" ON "hr_compliance_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_compliance_documents_verification_status_idx" ON "hr_compliance_documents"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "hr_compliance_modules_tenant_id_module_key_key" ON "hr_compliance_modules"("tenant_id", "module_key");

-- CreateIndex
CREATE INDEX "hr_compliance_reports_tenant_id_idx" ON "hr_compliance_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_context_snapshots_metric_type_idx" ON "hr_context_snapshots"("metric_type");

-- CreateIndex
CREATE INDEX "hr_context_snapshots_tenant_id_idx" ON "hr_context_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_employee_benefits_tenant_id_idx" ON "hr_employee_benefits"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_employee_skills_tenant_id_idx" ON "hr_employee_skills"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employee_skills_employee_id_skill_id_key" ON "hr_employee_skills"("employee_id", "skill_id");

-- CreateIndex
CREATE INDEX "hr_exchange_rates_tenant_id_idx" ON "hr_exchange_rates"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_headcount_plans_tenant_id_idx" ON "hr_headcount_plans"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_holidays_tenant_id_idx" ON "hr_holidays"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_insights_tenant_id_idx" ON "hr_insights"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_insights_type_idx" ON "hr_insights"("type");

-- CreateIndex
CREATE INDEX "hr_mentorship_pairs_tenant_id_idx" ON "hr_mentorship_pairs"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_payroll_runs_tenant_id_idx" ON "hr_payroll_runs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_payroll_runs_tenant_id_period_start_period_end_key" ON "hr_payroll_runs"("tenant_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "payroll_disbursement_logs_tenant_id_idx" ON "payroll_disbursement_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "payroll_disbursement_logs_payroll_run_id_idx" ON "payroll_disbursement_logs"("payroll_run_id");

-- CreateIndex
CREATE INDEX "hr_performance_cycles_tenant_id_idx" ON "hr_performance_cycles"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_performance_goals_tenant_id_idx" ON "hr_performance_goals"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_position_skills_tenant_id_idx" ON "hr_position_skills"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_position_skills_position_id_skill_id_key" ON "hr_position_skills"("position_id", "skill_id");

-- CreateIndex
CREATE INDEX "hr_program_skills_tenant_id_idx" ON "hr_program_skills"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_program_skills_program_id_skill_id_key" ON "hr_program_skills"("program_id", "skill_id");

-- CreateIndex
CREATE INDEX "hr_recommendation_feedbacks_recommendation_id_idx" ON "hr_recommendation_feedbacks"("recommendation_id");

-- CreateIndex
CREATE INDEX "hr_recommendation_feedbacks_tenant_id_idx" ON "hr_recommendation_feedbacks"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_recommendations_status_idx" ON "hr_recommendations"("status");

-- CreateIndex
CREATE INDEX "hr_recommendations_tenant_id_idx" ON "hr_recommendations"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_skills_tenant_id_idx" ON "hr_skills"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_succession_candidates_candidate_id_idx" ON "hr_succession_candidates"("candidate_id");

-- CreateIndex
CREATE INDEX "hr_succession_candidates_tenant_id_idx" ON "hr_succession_candidates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_succession_plans_position_id_key" ON "hr_succession_plans"("position_id");

-- CreateIndex
CREATE INDEX "hr_succession_plans_tenant_id_idx" ON "hr_succession_plans"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_system_alerts_tenant_id_idx" ON "hr_system_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_system_alerts_type_idx" ON "hr_system_alerts"("type");

-- CreateIndex
CREATE INDEX "hr_system_metrics_metric_name_idx" ON "hr_system_metrics"("metric_name");

-- CreateIndex
CREATE INDEX "hr_system_metrics_tenant_id_idx" ON "hr_system_metrics"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_talent_leads_status_idx" ON "hr_talent_leads"("status");

-- CreateIndex
CREATE INDEX "hr_talent_leads_tenant_id_idx" ON "hr_talent_leads"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_threshold_audits_tenant_id_idx" ON "hr_threshold_audits"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_work_schedules_department_id_idx" ON "hr_work_schedules"("department_id");

-- CreateIndex
CREATE INDEX "hr_work_schedules_location_id_idx" ON "hr_work_schedules"("location_id");

-- CreateIndex
CREATE INDEX "hr_work_schedules_tenant_id_idx" ON "hr_work_schedules"("tenant_id");

-- CreateIndex
CREATE INDEX "hr_work_shifts_employee_id_idx" ON "hr_work_shifts"("employee_id");

-- CreateIndex
CREATE INDEX "hr_work_shifts_location_id_idx" ON "hr_work_shifts"("location_id");

-- CreateIndex
CREATE INDEX "hr_work_shifts_role_id_idx" ON "hr_work_shifts"("role_id");

-- CreateIndex
CREATE INDEX "hr_work_shifts_schedule_id_idx" ON "hr_work_shifts"("schedule_id");

-- CreateIndex
CREATE INDEX "hr_work_shifts_tenant_id_idx" ON "hr_work_shifts"("tenant_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_tenant_id_idx" ON "idempotency_keys"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_tenant_id_key_endpoint_key" ON "idempotency_keys"("tenant_id", "key", "endpoint");

-- CreateIndex
CREATE INDEX "interviews_candidate_id_idx" ON "interviews"("candidate_id");

-- CreateIndex
CREATE INDEX "interviews_tenant_id_idx" ON "interviews"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_adjustments_tenant_id_idx" ON "inventory_adjustments"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_alerts_tenant_id_idx" ON "inventory_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_audit_cycles_tenant_id_idx" ON "inventory_audit_cycles"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_integration_events_tenant_id_idx" ON "inventory_integration_events"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_transfers_tenant_id_idx" ON "inventory_transfers"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_transfers_status_idx" ON "inventory_transfers"("status");

-- CreateIndex
CREATE INDEX "inventory_pool_stock_pool_id_idx" ON "inventory_pool_stock"("pool_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_pool_stock_pool_id_product_id_key" ON "inventory_pool_stock"("pool_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_pools_tenant_id_idx" ON "inventory_pools"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_pools_type_idx" ON "inventory_pools"("type");

-- CreateIndex
CREATE INDEX "inventory_subledger_entries_tenant_id_source_event_id_idx" ON "inventory_subledger_entries"("tenant_id", "source_event_id");

-- CreateIndex
CREATE INDEX "inventory_subledger_entries_tenant_id_status_idx" ON "inventory_subledger_entries"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_subledger_entries_tenant_id_source_event_id_entry_key" ON "inventory_subledger_entries"("tenant_id", "source_event_id", "entry_type");

-- CreateIndex
CREATE INDEX "it_device_events_tenant_id_device_id_idx" ON "it_device_events"("tenant_id", "device_id");

-- CreateIndex
CREATE INDEX "it_device_events_tenant_id_processed_idx" ON "it_device_events"("tenant_id", "processed");

-- CreateIndex
CREATE INDEX "it_devices_tenant_id_type_idx" ON "it_devices"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "it_provisioning_requests_tenant_id_idx" ON "it_provisioning_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "it_settings_tenant_id_idx" ON "it_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "it_settings_tenant_id_key_key" ON "it_settings"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "it_system_health_tenant_id_idx" ON "it_system_health"("tenant_id");

-- CreateIndex
CREATE INDEX "item_masters_category_id_idx" ON "item_masters"("category_id");

-- CreateIndex
CREATE INDEX "item_masters_tenant_id_idx" ON "item_masters"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_masters_tenant_id_barcode_key" ON "item_masters"("tenant_id", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "item_masters_tenant_id_sku_key" ON "item_masters"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "job_requisitions_status_idx" ON "job_requisitions"("status");

-- CreateIndex
CREATE INDEX "job_requisitions_tenant_id_idx" ON "job_requisitions"("tenant_id");

-- CreateIndex
CREATE INDEX "job_roles_tenant_id_idx" ON "job_roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_roles_tenant_id_code_key" ON "job_roles"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "label_configs_tenant_id_idx" ON "label_configs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "label_configs_tenant_id_location_id_module_type_key" ON "label_configs"("tenant_id", "location_id", "module_type");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_idx" ON "leave_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "locations_tenant_id_idx" ON "locations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_code_key" ON "locations"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "mail_accounts_tenant_id_idx" ON "mail_accounts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_accounts_user_id_address_key" ON "mail_accounts"("user_id", "address");

-- CreateIndex
CREATE UNIQUE INDEX "mail_folder_items_folder_id_message_id_key" ON "mail_folder_items"("folder_id", "message_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_folders_account_id_name_key" ON "mail_folders"("account_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mail_labels_tenant_id_name_key" ON "mail_labels"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "mail_messages_tenant_id_idx" ON "mail_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "mail_messages_thread_id_idx" ON "mail_messages"("thread_id");

-- CreateIndex
CREATE INDEX "mail_threads_tenant_id_idx" ON "mail_threads"("tenant_id");

-- CreateIndex
CREATE INDEX "marketing_accounts_tenant_id_idx" ON "marketing_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "marketing_alerts_tenant_id_idx" ON "marketing_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "marketing_attribution_campaign_id_idx" ON "marketing_attribution"("campaign_id");

-- CreateIndex
CREATE INDEX "marketing_attribution_lead_id_idx" ON "marketing_attribution"("lead_id");

-- CreateIndex
CREATE INDEX "marketing_attribution_tenant_id_idx" ON "marketing_attribution"("tenant_id");

-- CreateIndex
CREATE INDEX "marketing_audit_events_tenant_id_idx" ON "marketing_audit_events"("tenant_id");

-- CreateIndex
CREATE INDEX "marketing_campaigns_tenant_id_idx" ON "marketing_campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "marketing_executions_campaign_id_idx" ON "marketing_executions"("campaign_id");

-- CreateIndex
CREATE INDEX "marketing_executions_tenant_id_idx" ON "marketing_executions"("tenant_id");

-- CreateIndex
CREATE INDEX "marketing_leads_status_idx" ON "marketing_leads"("status");

-- CreateIndex
CREATE INDEX "marketing_leads_tenant_id_idx" ON "marketing_leads"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_leads_tenant_id_dedup_key_key" ON "marketing_leads"("tenant_id", "dedup_key");

-- CreateIndex
CREATE INDEX "marketing_workflows_tenant_id_idx" ON "marketing_workflows"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_definitions_code_key" ON "module_definitions"("code");

-- CreateIndex
CREATE INDEX "module_license_logs_license_id_idx" ON "module_license_logs"("license_id");

-- CreateIndex
CREATE INDEX "module_license_logs_tenant_id_idx" ON "module_license_logs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_licenses_license_key_key" ON "module_licenses"("license_key");

-- CreateIndex
CREATE INDEX "module_licenses_status_idx" ON "module_licenses"("status");

-- CreateIndex
CREATE INDEX "module_licenses_tenant_id_idx" ON "module_licenses"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_licenses_tenant_id_module_code_key" ON "module_licenses"("tenant_id", "module_code");

-- CreateIndex
CREATE INDEX "money_sources_tenant_id_idx" ON "money_sources"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_sources_tenant_id_name_key" ON "money_sources"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "payables_status_idx" ON "payables"("status");

-- CreateIndex
CREATE INDEX "payables_tenant_id_idx" ON "payables"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_audit_events_entity_id_idx" ON "payment_audit_events"("entity_id");

-- CreateIndex
CREATE INDEX "payment_audit_events_tenant_id_idx" ON "payment_audit_events"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_chargebacks_payment_id_idx" ON "payment_chargebacks"("payment_id");

-- CreateIndex
CREATE INDEX "payment_chargebacks_tenant_id_idx" ON "payment_chargebacks"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_device_pools_location_id_idx" ON "payment_device_pools"("location_id");

-- CreateIndex
CREATE INDEX "payment_device_pools_tenant_id_idx" ON "payment_device_pools"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_disputes_payment_id_idx" ON "payment_disputes"("payment_id");

-- CreateIndex
CREATE INDEX "payment_disputes_tenant_id_idx" ON "payment_disputes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_evidence_packs_payment_id_key" ON "payment_evidence_packs"("payment_id");

-- CreateIndex
CREATE INDEX "payment_evidence_packs_tenant_id_idx" ON "payment_evidence_packs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_pos_devices_device_code_key" ON "payment_pos_devices"("device_code");

-- CreateIndex
CREATE INDEX "payment_pos_devices_location_id_idx" ON "payment_pos_devices"("location_id");

-- CreateIndex
CREATE INDEX "payment_pos_devices_tenant_id_idx" ON "payment_pos_devices"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_providers_tenant_id_idx" ON "payment_providers"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_refunds_payment_id_idx" ON "payment_refunds"("payment_id");

-- CreateIndex
CREATE INDEX "payment_refunds_tenant_id_idx" ON "payment_refunds"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_retry_attempts_transaction_id_idx" ON "payment_retry_attempts"("transaction_id");

-- CreateIndex
CREATE INDEX "payment_routing_policies_tenant_id_idx" ON "payment_routing_policies"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_settlements_payment_id_key" ON "payment_settlements"("payment_id");

-- CreateIndex
CREATE INDEX "payment_settlements_tenant_id_idx" ON "payment_settlements"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_idempotency_key_key" ON "payment_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_transactions_idempotency_key_idx" ON "payment_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_tenant_id_idx" ON "payment_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "payroll_adjustment_lines_payroll_line_id_idx" ON "payroll_adjustment_lines"("payroll_line_id");

-- CreateIndex
CREATE INDEX "payroll_categories_tenant_id_idx" ON "payroll_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_categories_tenant_id_name_key" ON "payroll_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "payroll_lines_employee_id_idx" ON "payroll_lines"("employee_id");

-- CreateIndex
CREATE INDEX "payroll_lines_payroll_run_id_idx" ON "payroll_lines"("payroll_run_id");

-- CreateIndex
CREATE INDEX "payroll_lines_tenant_id_idx" ON "payroll_lines"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_profiles_employee_id_key" ON "payroll_profiles"("employee_id");

-- CreateIndex
CREATE INDEX "payroll_profiles_tenant_id_idx" ON "payroll_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "performance_reviews_cycle_id_idx" ON "performance_reviews"("cycle_id");

-- CreateIndex
CREATE INDEX "performance_reviews_employee_id_idx" ON "performance_reviews"("employee_id");

-- CreateIndex
CREATE INDEX "performance_reviews_tenant_id_idx" ON "performance_reviews"("tenant_id");

-- CreateIndex
CREATE INDEX "pos_devices_store_id_idx" ON "pos_devices"("store_id");

-- CreateIndex
CREATE INDEX "pos_devices_tenant_id_idx" ON "pos_devices"("tenant_id");

-- CreateIndex
CREATE INDEX "positions_status_idx" ON "positions"("status");

-- CreateIndex
CREATE INDEX "price_snapshots_tenant_id_idx" ON "price_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "price_versions_tenant_id_sku_id_idx" ON "price_versions"("tenant_id", "sku_id");

-- CreateIndex
CREATE INDEX "pricing_rules_tenant_id_idx" ON "pricing_rules"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_audit_events_entity_id_idx" ON "procurement_audit_events"("entity_id");

-- CreateIndex
CREATE INDEX "procurement_audit_events_tenant_id_idx" ON "procurement_audit_events"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_categories_tenant_id_idx" ON "procurement_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_categories_tenant_id_name_key" ON "procurement_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "procurement_contracts_requisition_id_idx" ON "procurement_contracts"("requisition_id");

-- CreateIndex
CREATE INDEX "procurement_contracts_tenant_id_idx" ON "procurement_contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_draft_pos_requisition_id_idx" ON "procurement_draft_pos"("requisition_id");

-- CreateIndex
CREATE INDEX "procurement_draft_pos_tenant_id_idx" ON "procurement_draft_pos"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_final_pos_requisition_id_idx" ON "procurement_final_pos"("requisition_id");

-- CreateIndex
CREATE INDEX "procurement_final_pos_tenant_id_idx" ON "procurement_final_pos"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_goods_receipt_syncs_final_po_id_idx" ON "procurement_goods_receipt_syncs"("final_po_id");

-- CreateIndex
CREATE INDEX "procurement_goods_receipt_syncs_tenant_id_idx" ON "procurement_goods_receipt_syncs"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_legal_handoffs_contract_id_idx" ON "procurement_legal_handoffs"("contract_id");

-- CreateIndex
CREATE INDEX "procurement_legal_handoffs_tenant_id_idx" ON "procurement_legal_handoffs"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_rating_logs_supplier_id_idx" ON "procurement_rating_logs"("supplier_id");

-- CreateIndex
CREATE INDEX "procurement_rating_logs_tenant_id_idx" ON "procurement_rating_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_receipts_final_po_id_idx" ON "procurement_receipts"("final_po_id");

-- CreateIndex
CREATE INDEX "procurement_receipts_tenant_id_idx" ON "procurement_receipts"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_requisitions_department_id_idx" ON "procurement_requisitions"("department_id");

-- CreateIndex
CREATE INDEX "procurement_requisitions_requester_id_idx" ON "procurement_requisitions"("requester_id");

-- CreateIndex
CREATE INDEX "procurement_requisitions_tenant_id_idx" ON "procurement_requisitions"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_risk_signals_status_idx" ON "procurement_risk_signals"("status");

-- CreateIndex
CREATE INDEX "procurement_risk_signals_tenant_id_idx" ON "procurement_risk_signals"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_sourcing_events_requisition_id_idx" ON "procurement_sourcing_events"("requisition_id");

-- CreateIndex
CREATE INDEX "procurement_sourcing_events_tenant_id_idx" ON "procurement_sourcing_events"("tenant_id");

-- CreateIndex
CREATE INDEX "procurement_supplier_access_requests_supplier_id_idx" ON "procurement_supplier_access_requests"("supplier_id");

-- CreateIndex
CREATE INDEX "procurement_supplier_access_requests_tenant_id_idx" ON "procurement_supplier_access_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "product_categories_tenant_id_idx" ON "product_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tenant_id_name_key" ON "product_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "product_projections_tenant_id_idx" ON "product_projections"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_projections_item_master_id_tenant_id_location_id_mo_key" ON "product_projections"("item_master_id", "tenant_id", "location_id", "module_type");

-- CreateIndex
CREATE INDEX "receivables_status_idx" ON "receivables"("status");

-- CreateIndex
CREATE INDEX "receivables_tenant_id_idx" ON "receivables"("tenant_id");

-- CreateIndex
CREATE INDEX "retail_cart_items_cart_id_idx" ON "retail_cart_items"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_cart_items_cart_id_product_id_key" ON "retail_cart_items"("cart_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_carts_customer_id_key" ON "retail_carts"("customer_id");

-- CreateIndex
CREATE INDEX "retail_carts_tenant_id_idx" ON "retail_carts"("tenant_id");

-- CreateIndex
CREATE INDEX "retail_channels_tenant_id_idx" ON "retail_channels"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_customer_auth_customer_id_key" ON "retail_customer_auth"("customer_id");

-- CreateIndex
CREATE INDEX "retail_customer_sessions_customer_id_idx" ON "retail_customer_sessions"("customer_id");

-- CreateIndex
CREATE INDEX "retail_customer_sessions_expires_at_idx" ON "retail_customer_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "retail_customer_sessions_tenant_id_idx" ON "retail_customer_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "retail_customers_tenant_id_idx" ON "retail_customers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_customers_tenant_id_email_key" ON "retail_customers"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "retail_customers_tenant_id_phone_key" ON "retail_customers"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "retail_gateway_nodes_load_balancer_id_idx" ON "retail_gateway_nodes"("load_balancer_id");

-- CreateIndex
CREATE INDEX "retail_gateway_nodes_tenant_id_idx" ON "retail_gateway_nodes"("tenant_id");

-- CreateIndex
CREATE INDEX "retail_load_balancers_tenant_id_idx" ON "retail_load_balancers"("tenant_id");

-- CreateIndex
CREATE INDEX "retail_order_items_order_id_idx" ON "retail_order_items"("order_id");

-- CreateIndex
CREATE INDEX "retail_order_items_product_id_idx" ON "retail_order_items"("product_id");

-- CreateIndex
CREATE INDEX "retail_order_items_tenant_id_idx" ON "retail_order_items"("tenant_id");

-- CreateIndex
CREATE INDEX "retail_orders_cashier_id_idx" ON "retail_orders"("cashier_id");

-- CreateIndex
CREATE INDEX "retail_orders_customer_id_idx" ON "retail_orders"("customer_id");

-- CreateIndex
CREATE INDEX "retail_orders_store_id_idx" ON "retail_orders"("store_id");

-- CreateIndex
CREATE INDEX "retail_orders_tenant_id_idx" ON "retail_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "retail_promotions_status_idx" ON "retail_promotions"("status");

-- CreateIndex
CREATE INDEX "retail_promotions_tenant_id_idx" ON "retail_promotions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_promotions_tenant_id_title_key" ON "retail_promotions"("tenant_id", "title");

-- CreateIndex
CREATE INDEX "retail_shifts_employee_id_idx" ON "retail_shifts"("employee_id");

-- CreateIndex
CREATE INDEX "retail_shifts_store_id_idx" ON "retail_shifts"("store_id");

-- CreateIndex
CREATE INDEX "retail_shifts_tenant_id_idx" ON "retail_shifts"("tenant_id");

-- CreateIndex
CREATE INDEX "retail_wishlist_items_wishlist_id_idx" ON "retail_wishlist_items"("wishlist_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_wishlist_items_wishlist_id_product_id_key" ON "retail_wishlist_items"("wishlist_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "retail_wishlists_customer_id_key" ON "retail_wishlists"("customer_id");

-- CreateIndex
CREATE INDEX "retail_wishlists_tenant_id_idx" ON "retail_wishlists"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_alerts_acknowledged_idx" ON "sales_alerts"("acknowledged");

-- CreateIndex
CREATE INDEX "sales_alerts_tenant_id_idx" ON "sales_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_audit_events_entity_id_idx" ON "sales_audit_events"("entity_id");

-- CreateIndex
CREATE INDEX "sales_audit_events_tenant_id_idx" ON "sales_audit_events"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_leads_status_idx" ON "sales_leads"("status");

-- CreateIndex
CREATE INDEX "sales_leads_tenant_id_idx" ON "sales_leads"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_opportunities_stage_idx" ON "sales_opportunities"("stage");

-- CreateIndex
CREATE INDEX "sales_opportunities_tenant_id_idx" ON "sales_opportunities"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_orders_status_idx" ON "sales_orders"("status");

-- CreateIndex
CREATE INDEX "sales_orders_tenant_id_idx" ON "sales_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_quotes_opportunity_id_idx" ON "sales_quotes"("opportunity_id");

-- CreateIndex
CREATE INDEX "sales_quotes_tenant_id_idx" ON "sales_quotes"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_tasks_owner_id_idx" ON "sales_tasks"("owner_id");

-- CreateIndex
CREATE INDEX "sales_tasks_tenant_id_idx" ON "sales_tasks"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_timeline_events_opportunity_id_idx" ON "sales_timeline_events"("opportunity_id");

-- CreateIndex
CREATE INDEX "sales_timeline_events_tenant_id_idx" ON "sales_timeline_events"("tenant_id");

-- CreateIndex
CREATE INDEX "schedule_assignments_employee_id_idx" ON "schedule_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "schedule_assignments_tenant_id_idx" ON "schedule_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "settlement_records_source_id_idx" ON "settlement_records"("source_id");

-- CreateIndex
CREATE INDEX "settlement_records_tenant_id_idx" ON "settlement_records"("tenant_id");

-- CreateIndex
CREATE INDEX "shifts_tenant_id_idx" ON "shifts"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_levels_tenant_id_idx" ON "stock_levels"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_location_id_product_id_department_id_key" ON "stock_levels"("location_id", "product_id", "department_id");

-- CreateIndex
CREATE INDEX "stock_movements_location_id_idx" ON "stock_movements"("location_id");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_idx" ON "stock_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_movements_transfer_group_id_idx" ON "stock_movements"("transfer_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_tenant_id_reference_id_reference_type_type__key" ON "stock_movements"("tenant_id", "reference_id", "reference_type", "type", "product_id", "location_id");

-- CreateIndex
CREATE INDEX "stock_reservations_expires_at_idx" ON "stock_reservations"("expires_at");

-- CreateIndex
CREATE INDEX "stock_reservations_tenant_id_product_id_location_id_idx" ON "stock_reservations"("tenant_id", "product_id", "location_id");

-- CreateIndex
CREATE INDEX "stock_snapshots_tenant_id_product_id_idx" ON "stock_snapshots"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "stores_location_id_idx" ON "stores"("location_id");

-- CreateIndex
CREATE INDEX "stores_status_idx" ON "stores"("status");

-- CreateIndex
CREATE INDEX "stores_tenant_id_idx" ON "stores"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_tenant_id_code_key" ON "stores"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "supplier_branches_supplier_id_idx" ON "supplier_branches"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_branches_tenant_id_idx" ON "supplier_branches"("tenant_id");

-- CreateIndex
CREATE INDEX "supplier_masters_tenant_id_idx" ON "supplier_masters"("tenant_id");

-- CreateIndex
CREATE INDEX "supplier_portal_messages_supplier_id_idx" ON "supplier_portal_messages"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_portal_messages_tenant_id_idx" ON "supplier_portal_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "supplier_products_branch_id_idx" ON "supplier_products"("branch_id");

-- CreateIndex
CREATE INDEX "supplier_products_supplier_id_idx" ON "supplier_products"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_products_tenant_id_idx" ON "supplier_products"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sync_anchors_tenant_id_table_name_key" ON "sync_anchors"("tenant_id", "table_name");

-- CreateIndex
CREATE INDEX "sys_idempotency_keys_expires_at_idx" ON "sys_idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "sys_idempotency_keys_tenant_id_key_idx" ON "sys_idempotency_keys"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "sys_idempotency_keys_tenant_id_key_key" ON "sys_idempotency_keys"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "sys_outbox_events_status_idx" ON "sys_outbox_events"("status");

-- CreateIndex
CREATE INDEX "sys_outbox_events_tenant_id_idx" ON "sys_outbox_events"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_chain_repairs_tenant_id_idx" ON "audit_chain_repairs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_chain_repairs_created_at_idx" ON "audit_chain_repairs"("created_at");

-- CreateIndex
CREATE INDEX "sys_report_jobs_status_idx" ON "sys_report_jobs"("status");

-- CreateIndex
CREATE INDEX "sys_report_jobs_tenant_id_idx" ON "sys_report_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");

-- CreateIndex
CREATE INDEX "system_logs_module_idx" ON "system_logs"("module");

-- CreateIndex
CREATE INDEX "system_logs_tenant_id_idx" ON "system_logs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_settings_tenant_id_idx" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "training_assignments_employee_id_idx" ON "training_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "training_assignments_program_id_idx" ON "training_assignments"("program_id");

-- CreateIndex
CREATE INDEX "training_assignments_tenant_id_idx" ON "training_assignments"("tenant_id");

-- CreateIndex
CREATE INDEX "training_programs_tenant_id_idx" ON "training_programs"("tenant_id");

-- CreateIndex
CREATE INDEX "treasury_transfers_tenant_id_idx" ON "treasury_transfers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_companies_user_id_tenant_id_key" ON "user_companies"("user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "user_notification_preferences_tenant_id_idx" ON "user_notification_preferences"("tenant_id");

-- CreateIndex
CREATE INDEX "user_notification_preferences_tenant_id_module_event_type_idx" ON "user_notification_preferences"("tenant_id", "module", "event_type");

-- CreateIndex
CREATE INDEX "user_notification_preferences_tenant_id_user_id_idx" ON "user_notification_preferences"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_tenant_id_user_id_module_even_key" ON "user_notification_preferences"("tenant_id", "user_id", "module", "event_type", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "workflow_audit_entries_tenant_id_idx" ON "workflow_audit_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "workflow_audit_entries_workflow_id_idx" ON "workflow_audit_entries"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_tenant_id_name_version_key" ON "workflow_definitions"("tenant_id", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_correlation_id_key" ON "workflow_instances"("correlation_id");

-- CreateIndex
CREATE INDEX "workflow_instances_tenant_id_status_idx" ON "workflow_instances"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "workflow_requests_entity_type_entity_id_idx" ON "workflow_requests"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "workflow_requests_status_idx" ON "workflow_requests"("status");

-- CreateIndex
CREATE INDEX "workflow_requests_tenant_id_idx" ON "workflow_requests"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_overrides_tenant_id_user_id_module_action_key" ON "permission_overrides"("tenant_id", "user_id", "module", "action");

-- CreateIndex
CREATE INDEX "_EcommerceBranchLinks_B_index" ON "_EcommerceBranchLinks"("B");

-- CreateIndex
CREATE INDEX "_MessageLabels_B_index" ON "_MessageLabels"("B");

-- AddForeignKey
ALTER TABLE "agentic_events" ADD CONSTRAINT "agentic_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_hash_anchors" ADD CONSTRAINT "audit_hash_anchors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_categories" ADD CONSTRAINT "bulletin_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_comments" ADD CONSTRAINT "bulletin_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "bulletin_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_comments" ADD CONSTRAINT "bulletin_comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_posts" ADD CONSTRAINT "bulletin_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_reactions" ADD CONSTRAINT "bulletin_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "bulletin_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_reactions" ADD CONSTRAINT "bulletin_reactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_reads" ADD CONSTRAINT "bulletin_reads_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "bulletin_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "job_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capex_requests" ADD CONSTRAINT "capex_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_reactions" ADD CONSTRAINT "chat_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "comms_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_reservations" ADD CONSTRAINT "clinic_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comms_chat_messages" ADD CONSTRAINT "comms_chat_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "comms_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comms_chat_messages" ADD CONSTRAINT "comms_chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comms_chat_messages" ADD CONSTRAINT "comms_chat_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensations" ADD CONSTRAINT "compensations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensations" ADD CONSTRAINT "compensations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_layers" ADD CONSTRAINT "cost_layers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshots" ADD CONSTRAINT "cost_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_connectors" ADD CONSTRAINT "ecommerce_connectors_inventory_pool_id_fkey" FOREIGN KEY ("inventory_pool_id") REFERENCES "inventory_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_connectors" ADD CONSTRAINT "ecommerce_connectors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_overrides" ADD CONSTRAINT "emergency_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_role_id_fkey" FOREIGN KEY ("job_role_id") REFERENCES "job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_deliveries" ADD CONSTRAINT "event_deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "domain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_deliveries" ADD CONSTRAINT "event_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farming_sensor_logs" ADD CONSTRAINT "farming_sensor_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_account_balance_snapshots" ADD CONSTRAINT "finance_account_balance_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_account_balances" ADD CONSTRAINT "finance_account_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ap_payment_allocations" ADD CONSTRAINT "finance_ap_payment_allocations_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "payables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ap_payment_allocations" ADD CONSTRAINT "finance_ap_payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_credit_memos" ADD CONSTRAINT "finance_ar_credit_memos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_customer_credit_balances" ADD CONSTRAINT "finance_ar_customer_credit_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_customers" ADD CONSTRAINT "finance_ar_customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_invoice_lines" ADD CONSTRAINT "finance_ar_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "finance_ar_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_invoices" ADD CONSTRAINT "finance_ar_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "finance_ar_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_invoices" ADD CONSTRAINT "finance_ar_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_invoices" ADD CONSTRAINT "finance_ar_invoices_workflow_request_id_fkey" FOREIGN KEY ("workflow_request_id") REFERENCES "workflow_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_payment_allocations" ADD CONSTRAINT "finance_ar_payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "finance_ar_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_payment_allocations" ADD CONSTRAINT "finance_ar_payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "finance_ar_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_payment_allocations" ADD CONSTRAINT "finance_ar_payment_allocations_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ar_payments" ADD CONSTRAINT "finance_ar_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_asset_categories" ADD CONSTRAINT "finance_asset_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_bank_statements" ADD CONSTRAINT "finance_bank_statements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_bank_statements" ADD CONSTRAINT "finance_bank_statements_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "finance_chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_bank_transactions" ADD CONSTRAINT "finance_bank_transactions_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "finance_bank_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_actuals" ADD CONSTRAINT "finance_budget_actuals_budgetScenarioId_fkey" FOREIGN KEY ("budgetScenarioId") REFERENCES "hr_budget_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_actuals" ADD CONSTRAINT "finance_budget_actuals_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "finance_budget_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_actuals" ADD CONSTRAINT "finance_budget_actuals_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "finance_chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_actuals" ADD CONSTRAINT "finance_budget_actuals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_actuals" ADD CONSTRAINT "finance_budget_actuals_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_actuals" ADD CONSTRAINT "finance_budget_actuals_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "finance_fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_lines" ADD CONSTRAINT "finance_budget_lines_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "finance_chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_lines" ADD CONSTRAINT "finance_budget_lines_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_lines" ADD CONSTRAINT "finance_budget_lines_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_lines" ADD CONSTRAINT "finance_budget_lines_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "finance_fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_budget_lines" ADD CONSTRAINT "finance_budget_lines_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "hr_budget_scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_chart_of_accounts" ADD CONSTRAINT "finance_chart_of_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_expense_policies" ADD CONSTRAINT "finance_expense_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_fiscal_periods" ADD CONSTRAINT "finance_fiscal_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "finance_fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "finance_journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_journal_lines" ADD CONSTRAINT "finance_journal_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_journal_reversals" ADD CONSTRAINT "finance_journal_reversals_original_journal_id_fkey" FOREIGN KEY ("original_journal_id") REFERENCES "finance_journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_journal_reversals" ADD CONSTRAINT "finance_journal_reversals_reversal_journal_id_fkey" FOREIGN KEY ("reversal_journal_id") REFERENCES "finance_journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_journal_reversals" ADD CONSTRAINT "finance_journal_reversals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_event_log" ADD CONSTRAINT "finance_ledger_event_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_event_log_archive" ADD CONSTRAINT "finance_ledger_event_log_archive_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_hash_anchors" ADD CONSTRAINT "finance_ledger_hash_anchors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_idempotency" ADD CONSTRAINT "finance_ledger_idempotency_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_posting_lines" ADD CONSTRAINT "finance_ledger_posting_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_posting_lines" ADD CONSTRAINT "finance_ledger_posting_lines_ledger_posting_id_fkey" FOREIGN KEY ("ledger_posting_id") REFERENCES "finance_ledger_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_posting_rule_lines" ADD CONSTRAINT "finance_ledger_posting_rule_lines_posting_rule_id_fkey" FOREIGN KEY ("posting_rule_id") REFERENCES "finance_ledger_posting_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_posting_rules" ADD CONSTRAINT "finance_ledger_posting_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_postings" ADD CONSTRAINT "finance_ledger_postings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_recon_matches" ADD CONSTRAINT "finance_recon_matches_bank_transaction_id_fkey" FOREIGN KEY ("bank_transaction_id") REFERENCES "finance_bank_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_recon_matches" ADD CONSTRAINT "finance_recon_matches_ledger_journal_id_fkey" FOREIGN KEY ("ledger_journal_id") REFERENCES "finance_journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_recon_matches" ADD CONSTRAINT "finance_recon_matches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_settings" ADD CONSTRAINT "finance_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_system_mappings" ADD CONSTRAINT "finance_system_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_tax_configs" ADD CONSTRAINT "finance_tax_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_tax_rates" ADD CONSTRAINT "finance_tax_rates_tax_rule_id_fkey" FOREIGN KEY ("tax_rule_id") REFERENCES "finance_tax_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_tax_rules" ADD CONSTRAINT "finance_tax_rules_tax_config_id_fkey" FOREIGN KEY ("tax_config_id") REFERENCES "finance_tax_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_capex_request_id_fkey" FOREIGN KEY ("capex_request_id") REFERENCES "capex_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_ingredients" ADD CONSTRAINT "fnb_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "fnb_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_ingredients" ADD CONSTRAINT "fnb_ingredients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_recipes" ADD CONSTRAINT "fnb_recipes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance_records" ADD CONSTRAINT "hr_attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance_records" ADD CONSTRAINT "hr_attendance_records_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance_records" ADD CONSTRAINT "hr_attendance_records_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance_records" ADD CONSTRAINT "hr_attendance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance_records" ADD CONSTRAINT "hr_attendance_records_work_schedule_id_fkey" FOREIGN KEY ("work_schedule_id") REFERENCES "hr_work_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_attendance_records" ADD CONSTRAINT "hr_attendance_records_work_shift_id_fkey" FOREIGN KEY ("work_shift_id") REFERENCES "hr_work_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_benefit_plans" ADD CONSTRAINT "hr_benefit_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_budget_scenarios" ADD CONSTRAINT "hr_budget_scenarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_career_paths" ADD CONSTRAINT "hr_career_paths_from_position_id_fkey" FOREIGN KEY ("from_position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_career_paths" ADD CONSTRAINT "hr_career_paths_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_career_paths" ADD CONSTRAINT "hr_career_paths_to_position_id_fkey" FOREIGN KEY ("to_position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_cases" ADD CONSTRAINT "hr_cases_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_cases" ADD CONSTRAINT "hr_cases_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_cases" ADD CONSTRAINT "hr_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_compliance_documents" ADD CONSTRAINT "hr_compliance_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_compliance_documents" ADD CONSTRAINT "hr_compliance_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_compliance_modules" ADD CONSTRAINT "hr_compliance_modules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_compliance_reports" ADD CONSTRAINT "hr_compliance_reports_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "hr_payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_compliance_reports" ADD CONSTRAINT "hr_compliance_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_context_snapshots" ADD CONSTRAINT "hr_context_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_benefits" ADD CONSTRAINT "hr_employee_benefits_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_benefits" ADD CONSTRAINT "hr_employee_benefits_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "hr_benefit_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_benefits" ADD CONSTRAINT "hr_employee_benefits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_skills" ADD CONSTRAINT "hr_employee_skills_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_skills" ADD CONSTRAINT "hr_employee_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "hr_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee_skills" ADD CONSTRAINT "hr_employee_skills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_exchange_rates" ADD CONSTRAINT "hr_exchange_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_headcount_plans" ADD CONSTRAINT "hr_headcount_plans_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_headcount_plans" ADD CONSTRAINT "hr_headcount_plans_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "hr_budget_scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_headcount_plans" ADD CONSTRAINT "hr_headcount_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_holidays" ADD CONSTRAINT "hr_holidays_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_insights" ADD CONSTRAINT "hr_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_mentorship_pairs" ADD CONSTRAINT "hr_mentorship_pairs_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_mentorship_pairs" ADD CONSTRAINT "hr_mentorship_pairs_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_mentorship_pairs" ADD CONSTRAINT "hr_mentorship_pairs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_payroll_runs" ADD CONSTRAINT "hr_payroll_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_disbursement_logs" ADD CONSTRAINT "payroll_disbursement_logs_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "hr_payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_disbursement_logs" ADD CONSTRAINT "payroll_disbursement_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_performance_cycles" ADD CONSTRAINT "hr_performance_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_performance_goals" ADD CONSTRAINT "hr_performance_goals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_performance_goals" ADD CONSTRAINT "hr_performance_goals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_position_skills" ADD CONSTRAINT "hr_position_skills_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_position_skills" ADD CONSTRAINT "hr_position_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "hr_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_position_skills" ADD CONSTRAINT "hr_position_skills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_program_skills" ADD CONSTRAINT "hr_program_skills_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_program_skills" ADD CONSTRAINT "hr_program_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "hr_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_program_skills" ADD CONSTRAINT "hr_program_skills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_recommendation_feedbacks" ADD CONSTRAINT "hr_recommendation_feedbacks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_recommendations" ADD CONSTRAINT "hr_recommendations_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "hr_insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_recommendations" ADD CONSTRAINT "hr_recommendations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_skills" ADD CONSTRAINT "hr_skills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_succession_candidates" ADD CONSTRAINT "hr_succession_candidates_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_succession_candidates" ADD CONSTRAINT "hr_succession_candidates_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "hr_succession_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_succession_candidates" ADD CONSTRAINT "hr_succession_candidates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_succession_plans" ADD CONSTRAINT "hr_succession_plans_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_succession_plans" ADD CONSTRAINT "hr_succession_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_system_alerts" ADD CONSTRAINT "hr_system_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_system_metrics" ADD CONSTRAINT "hr_system_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_talent_leads" ADD CONSTRAINT "hr_talent_leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_threshold_audits" ADD CONSTRAINT "hr_threshold_audits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_work_schedules" ADD CONSTRAINT "hr_work_schedules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_work_schedules" ADD CONSTRAINT "hr_work_schedules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_work_schedules" ADD CONSTRAINT "hr_work_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_work_shifts" ADD CONSTRAINT "hr_work_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_work_shifts" ADD CONSTRAINT "hr_work_shifts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_work_shifts" ADD CONSTRAINT "hr_work_shifts_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_work_shifts" ADD CONSTRAINT "hr_work_shifts_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "hr_work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_audit_cycles" ADD CONSTRAINT "inventory_audit_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_integration_events" ADD CONSTRAINT "inventory_integration_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement_requests" ADD CONSTRAINT "inventory_movement_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement_requests" ADD CONSTRAINT "inventory_movement_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_pool_stock" ADD CONSTRAINT "inventory_pool_stock_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "inventory_pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_pool_stock" ADD CONSTRAINT "inventory_pool_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_pools" ADD CONSTRAINT "inventory_pools_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_subledger_entries" ADD CONSTRAINT "inventory_subledger_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_device_events" ADD CONSTRAINT "it_device_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "it_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_device_events" ADD CONSTRAINT "it_device_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_devices" ADD CONSTRAINT "it_devices_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_devices" ADD CONSTRAINT "it_devices_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_devices" ADD CONSTRAINT "it_devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_provisioning_requests" ADD CONSTRAINT "it_provisioning_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_provisioning_requests" ADD CONSTRAINT "it_provisioning_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_provisioning_requests" ADD CONSTRAINT "it_provisioning_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_settings" ADD CONSTRAINT "it_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_system_health" ADD CONSTRAINT "it_system_health_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_masters" ADD CONSTRAINT "item_masters_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_masters" ADD CONSTRAINT "item_masters_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_masters" ADD CONSTRAINT "item_masters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_configs" ADD CONSTRAINT "label_configs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_configs" ADD CONSTRAINT "label_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_accounts" ADD CONSTRAINT "mail_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_folder_items" ADD CONSTRAINT "mail_folder_items_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "mail_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_folder_items" ADD CONSTRAINT "mail_folder_items_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "mail_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_folders" ADD CONSTRAINT "mail_folders_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mail_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_labels" ADD CONSTRAINT "mail_labels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "mail_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "mail_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_threads" ADD CONSTRAINT "mail_threads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_accounts" ADD CONSTRAINT "marketing_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_alerts" ADD CONSTRAINT "marketing_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_attribution" ADD CONSTRAINT "marketing_attribution_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_attribution" ADD CONSTRAINT "marketing_attribution_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "marketing_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_attribution" ADD CONSTRAINT "marketing_attribution_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_audit_events" ADD CONSTRAINT "marketing_audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_executions" ADD CONSTRAINT "marketing_executions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_executions" ADD CONSTRAINT "marketing_executions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_leads" ADD CONSTRAINT "marketing_leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_workflows" ADD CONSTRAINT "marketing_workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_license_logs" ADD CONSTRAINT "module_license_logs_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "module_licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_license_logs" ADD CONSTRAINT "module_license_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_licenses" ADD CONSTRAINT "module_licenses_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "module_definitions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_licenses" ADD CONSTRAINT "module_licenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "money_sources" ADD CONSTRAINT "money_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_workflow_request_id_fkey" FOREIGN KEY ("workflow_request_id") REFERENCES "workflow_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_audit_events" ADD CONSTRAINT "payment_audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_chargebacks" ADD CONSTRAINT "payment_chargebacks_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "payment_disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_chargebacks" ADD CONSTRAINT "payment_chargebacks_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_chargebacks" ADD CONSTRAINT "payment_chargebacks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_device_pools" ADD CONSTRAINT "payment_device_pools_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_disputes" ADD CONSTRAINT "payment_disputes_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_disputes" ADD CONSTRAINT "payment_disputes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_evidence_packs" ADD CONSTRAINT "payment_evidence_packs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_pos_devices" ADD CONSTRAINT "payment_pos_devices_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "payment_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_pos_devices" ADD CONSTRAINT "payment_pos_devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_providers" ADD CONSTRAINT "payment_providers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_retry_attempts" ADD CONSTRAINT "payment_retry_attempts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "payment_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_retry_attempts" ADD CONSTRAINT "payment_retry_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_retry_attempts" ADD CONSTRAINT "payment_retry_attempts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_routing_policies" ADD CONSTRAINT "payment_routing_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_settlements" ADD CONSTRAINT "payment_settlements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_evidence_pack_id_fkey" FOREIGN KEY ("evidence_pack_id") REFERENCES "payment_evidence_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "payment_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "payment_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_workflow_request_id_fkey" FOREIGN KEY ("workflow_request_id") REFERENCES "workflow_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustment_lines" ADD CONSTRAINT "payroll_adjustment_lines_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "payroll_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustment_lines" ADD CONSTRAINT "payroll_adjustment_lines_payroll_line_id_fkey" FOREIGN KEY ("payroll_line_id") REFERENCES "payroll_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_adjustment_lines" ADD CONSTRAINT "payroll_adjustment_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_categories" ADD CONSTRAINT "payroll_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "hr_payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_profiles" ADD CONSTRAINT "payroll_profiles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_profiles" ADD CONSTRAINT "payroll_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "hr_performance_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_audit_events" ADD CONSTRAINT "procurement_audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_categories" ADD CONSTRAINT "procurement_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_contracts" ADD CONSTRAINT "procurement_contracts_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "procurement_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_contracts" ADD CONSTRAINT "procurement_contracts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_contracts" ADD CONSTRAINT "procurement_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_draft_pos" ADD CONSTRAINT "procurement_draft_pos_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "procurement_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_draft_pos" ADD CONSTRAINT "procurement_draft_pos_supplier_branch_id_fkey" FOREIGN KEY ("supplier_branch_id") REFERENCES "supplier_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_draft_pos" ADD CONSTRAINT "procurement_draft_pos_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_draft_pos" ADD CONSTRAINT "procurement_draft_pos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_final_pos" ADD CONSTRAINT "procurement_final_pos_draft_po_id_fkey" FOREIGN KEY ("draft_po_id") REFERENCES "procurement_draft_pos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_final_pos" ADD CONSTRAINT "procurement_final_pos_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "procurement_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_final_pos" ADD CONSTRAINT "procurement_final_pos_supplier_branch_id_fkey" FOREIGN KEY ("supplier_branch_id") REFERENCES "supplier_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_final_pos" ADD CONSTRAINT "procurement_final_pos_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_final_pos" ADD CONSTRAINT "procurement_final_pos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_goods_receipt_syncs" ADD CONSTRAINT "procurement_goods_receipt_syncs_final_po_id_fkey" FOREIGN KEY ("final_po_id") REFERENCES "procurement_final_pos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_goods_receipt_syncs" ADD CONSTRAINT "procurement_goods_receipt_syncs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_legal_handoffs" ADD CONSTRAINT "procurement_legal_handoffs_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "procurement_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_legal_handoffs" ADD CONSTRAINT "procurement_legal_handoffs_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "procurement_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_legal_handoffs" ADD CONSTRAINT "procurement_legal_handoffs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_rating_logs" ADD CONSTRAINT "procurement_rating_logs_supplier_branch_id_fkey" FOREIGN KEY ("supplier_branch_id") REFERENCES "supplier_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_rating_logs" ADD CONSTRAINT "procurement_rating_logs_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_rating_logs" ADD CONSTRAINT "procurement_rating_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_receipts" ADD CONSTRAINT "procurement_receipts_final_po_id_fkey" FOREIGN KEY ("final_po_id") REFERENCES "procurement_final_pos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_receipts" ADD CONSTRAINT "procurement_receipts_supplier_branch_id_fkey" FOREIGN KEY ("supplier_branch_id") REFERENCES "supplier_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_receipts" ADD CONSTRAINT "procurement_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_receipts" ADD CONSTRAINT "procurement_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_requisitions" ADD CONSTRAINT "procurement_requisitions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_requisitions" ADD CONSTRAINT "procurement_requisitions_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_requisitions" ADD CONSTRAINT "procurement_requisitions_supplier_branch_id_fkey" FOREIGN KEY ("supplier_branch_id") REFERENCES "supplier_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_requisitions" ADD CONSTRAINT "procurement_requisitions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_requisitions" ADD CONSTRAINT "procurement_requisitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_risk_signals" ADD CONSTRAINT "procurement_risk_signals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_sourcing_events" ADD CONSTRAINT "procurement_sourcing_events_final_po_id_fkey" FOREIGN KEY ("final_po_id") REFERENCES "procurement_final_pos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_sourcing_events" ADD CONSTRAINT "procurement_sourcing_events_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "procurement_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_sourcing_events" ADD CONSTRAINT "procurement_sourcing_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_supplier_access_requests" ADD CONSTRAINT "procurement_supplier_access_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_supplier_access_requests" ADD CONSTRAINT "procurement_supplier_access_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_projections" ADD CONSTRAINT "product_projections_item_master_id_fkey" FOREIGN KEY ("item_master_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_projections" ADD CONSTRAINT "product_projections_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_projections" ADD CONSTRAINT "product_projections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_cart_items" ADD CONSTRAINT "retail_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "retail_carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_cart_items" ADD CONSTRAINT "retail_cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_carts" ADD CONSTRAINT "retail_carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_carts" ADD CONSTRAINT "retail_carts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_channels" ADD CONSTRAINT "retail_channels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_auth" ADD CONSTRAINT "retail_customer_auth_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_sessions" ADD CONSTRAINT "retail_customer_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customer_sessions" ADD CONSTRAINT "retail_customer_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_customers" ADD CONSTRAINT "retail_customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_gateway_nodes" ADD CONSTRAINT "retail_gateway_nodes_load_balancer_id_fkey" FOREIGN KEY ("load_balancer_id") REFERENCES "retail_load_balancers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_gateway_nodes" ADD CONSTRAINT "retail_gateway_nodes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_load_balancers" ADD CONSTRAINT "retail_load_balancers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_order_items" ADD CONSTRAINT "retail_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "retail_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_order_items" ADD CONSTRAINT "retail_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_order_items" ADD CONSTRAINT "retail_order_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_orders" ADD CONSTRAINT "retail_orders_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_orders" ADD CONSTRAINT "retail_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_orders" ADD CONSTRAINT "retail_orders_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "pos_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_orders" ADD CONSTRAINT "retail_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_orders" ADD CONSTRAINT "retail_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_promotions" ADD CONSTRAINT "retail_promotions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_shifts" ADD CONSTRAINT "retail_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_shifts" ADD CONSTRAINT "retail_shifts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_shifts" ADD CONSTRAINT "retail_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_wishlist_items" ADD CONSTRAINT "retail_wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_wishlist_items" ADD CONSTRAINT "retail_wishlist_items_wishlist_id_fkey" FOREIGN KEY ("wishlist_id") REFERENCES "retail_wishlists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_wishlists" ADD CONSTRAINT "retail_wishlists_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "retail_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retail_wishlists" ADD CONSTRAINT "retail_wishlists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_alerts" ADD CONSTRAINT "sales_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_audit_events" ADD CONSTRAINT "sales_audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_leads" ADD CONSTRAINT "sales_leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_opportunities" ADD CONSTRAINT "sales_opportunities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "sales_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_opportunities" ADD CONSTRAINT "sales_opportunities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "sales_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "sales_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quotes" ADD CONSTRAINT "sales_quotes_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "sales_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quotes" ADD CONSTRAINT "sales_quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_tasks" ADD CONSTRAINT "sales_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "sales_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_tasks" ADD CONSTRAINT "sales_tasks_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "sales_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_tasks" ADD CONSTRAINT "sales_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_timeline_events" ADD CONSTRAINT "sales_timeline_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "sales_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_timeline_events" ADD CONSTRAINT "sales_timeline_events_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "sales_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_timeline_events" ADD CONSTRAINT "sales_timeline_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_records" ADD CONSTRAINT "settlement_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_department_id_fkey" FOREIGN KEY ("from_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_department_id_fkey" FOREIGN KEY ("to_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "item_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_inventory_pool_id_fkey" FOREIGN KEY ("inventory_pool_id") REFERENCES "inventory_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_branches" ADD CONSTRAINT "supplier_branches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_branches" ADD CONSTRAINT "supplier_branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_masters" ADD CONSTRAINT "supplier_masters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_portal_messages" ADD CONSTRAINT "supplier_portal_messages_supplier_branch_id_fkey" FOREIGN KEY ("supplier_branch_id") REFERENCES "supplier_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_portal_messages" ADD CONSTRAINT "supplier_portal_messages_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_portal_messages" ADD CONSTRAINT "supplier_portal_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "supplier_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_anchors" ADD CONSTRAINT "sync_anchors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_idempotency_keys" ADD CONSTRAINT "sys_idempotency_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_outbox_events" ADD CONSTRAINT "sys_outbox_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_report_jobs" ADD CONSTRAINT "sys_report_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "training_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_audit_entries" ADD CONSTRAINT "workflow_audit_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_audit_entries" ADD CONSTRAINT "workflow_audit_entries_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_requests" ADD CONSTRAINT "workflow_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job_queue" ADD CONSTRAINT "print_job_queue_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_audit_master" ADD CONSTRAINT "stock_audit_master_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_audit_lines" ADD CONSTRAINT "stock_audit_lines_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "stock_audit_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EcommerceBranchLinks" ADD CONSTRAINT "_EcommerceBranchLinks_A_fkey" FOREIGN KEY ("A") REFERENCES "ecommerce_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EcommerceBranchLinks" ADD CONSTRAINT "_EcommerceBranchLinks_B_fkey" FOREIGN KEY ("B") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageLabels" ADD CONSTRAINT "_MessageLabels_A_fkey" FOREIGN KEY ("A") REFERENCES "mail_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageLabels" ADD CONSTRAINT "_MessageLabels_B_fkey" FOREIGN KEY ("B") REFERENCES "mail_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

