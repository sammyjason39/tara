-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('DIRECT', 'GROUP', 'DEPARTMENT', 'LOCATION', 'COMPANY', 'ROLE');

-- DropIndex
DROP INDEX "audit_logs_entity_type_entity_id_idx";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'INFO',
ADD COLUMN     "user_agent" TEXT;

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

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_definitions_pkey" PRIMARY KEY ("id")
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_licenses_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "module_license_logs_pkey" PRIMARY KEY ("id")
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
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "chat_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "attachments" JSONB,
    "ref_module" TEXT,
    "ref_entity_id" TEXT,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "reply_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_reactions_pkey" PRIMARY KEY ("id")
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
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mail_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_threads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_threads_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "mail_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_folders" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_folder_items" (
    "id" TEXT NOT NULL,
    "folder_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,

    CONSTRAINT "mail_folder_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_labels" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',

    CONSTRAINT "mail_labels_pkey" PRIMARY KEY ("id")
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
    "scopeType" TEXT NOT NULL DEFAULT 'company',
    "scope_id" TEXT,
    "publish_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bulletin_posts_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "bulletin_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletin_reactions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulletin_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletin_reads" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulletin_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MessageLabels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MessageLabels_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "system_logs_tenant_id_idx" ON "system_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "system_logs_module_idx" ON "system_logs"("module");

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "module_definitions_code_key" ON "module_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "module_licenses_license_key_key" ON "module_licenses"("license_key");

-- CreateIndex
CREATE INDEX "module_licenses_tenant_id_idx" ON "module_licenses"("tenant_id");

-- CreateIndex
CREATE INDEX "module_licenses_status_idx" ON "module_licenses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "module_licenses_tenant_id_module_code_key" ON "module_licenses"("tenant_id", "module_code");

-- CreateIndex
CREATE INDEX "module_license_logs_license_id_idx" ON "module_license_logs"("license_id");

-- CreateIndex
CREATE INDEX "module_license_logs_tenant_id_idx" ON "module_license_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_rooms_tenant_id_idx" ON "chat_rooms"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_rooms_type_idx" ON "chat_rooms"("type");

-- CreateIndex
CREATE INDEX "chat_members_tenant_id_idx" ON "chat_members"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_members_user_id_idx" ON "chat_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_members_room_id_user_id_key" ON "chat_members"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_messages_tenant_id_idx" ON "chat_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "chat_messages_room_id_idx" ON "chat_messages"("room_id");

-- CreateIndex
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_reactions_message_id_user_id_emoji_key" ON "chat_reactions"("message_id", "user_id", "emoji");

-- CreateIndex
CREATE INDEX "mail_accounts_tenant_id_idx" ON "mail_accounts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_accounts_user_id_address_key" ON "mail_accounts"("user_id", "address");

-- CreateIndex
CREATE INDEX "mail_threads_tenant_id_idx" ON "mail_threads"("tenant_id");

-- CreateIndex
CREATE INDEX "mail_messages_tenant_id_idx" ON "mail_messages"("tenant_id");

-- CreateIndex
CREATE INDEX "mail_messages_thread_id_idx" ON "mail_messages"("thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_folders_account_id_name_key" ON "mail_folders"("account_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mail_folder_items_folder_id_message_id_key" ON "mail_folder_items"("folder_id", "message_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_labels_tenant_id_name_key" ON "mail_labels"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "bulletin_posts_tenant_id_idx" ON "bulletin_posts"("tenant_id");

-- CreateIndex
CREATE INDEX "bulletin_posts_status_idx" ON "bulletin_posts"("status");

-- CreateIndex
CREATE INDEX "bulletin_comments_tenant_id_idx" ON "bulletin_comments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulletin_reactions_post_id_user_id_emoji_key" ON "bulletin_reactions"("post_id", "user_id", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "bulletin_reads_post_id_user_id_key" ON "bulletin_reads"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "_MessageLabels_B_index" ON "_MessageLabels"("B");

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_licenses" ADD CONSTRAINT "module_licenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_licenses" ADD CONSTRAINT "module_licenses_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "module_definitions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_license_logs" ADD CONSTRAINT "module_license_logs_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "module_licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_license_logs" ADD CONSTRAINT "module_license_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_reactions" ADD CONSTRAINT "chat_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_accounts" ADD CONSTRAINT "mail_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_threads" ADD CONSTRAINT "mail_threads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "mail_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "mail_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_folders" ADD CONSTRAINT "mail_folders_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mail_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_folder_items" ADD CONSTRAINT "mail_folder_items_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "mail_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_folder_items" ADD CONSTRAINT "mail_folder_items_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "mail_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_labels" ADD CONSTRAINT "mail_labels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_posts" ADD CONSTRAINT "bulletin_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_comments" ADD CONSTRAINT "bulletin_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "bulletin_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_comments" ADD CONSTRAINT "bulletin_comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_reactions" ADD CONSTRAINT "bulletin_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "bulletin_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletin_reads" ADD CONSTRAINT "bulletin_reads_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "bulletin_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageLabels" ADD CONSTRAINT "_MessageLabels_A_fkey" FOREIGN KEY ("A") REFERENCES "mail_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageLabels" ADD CONSTRAINT "_MessageLabels_B_fkey" FOREIGN KEY ("B") REFERENCES "mail_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
