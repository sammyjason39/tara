/*
  Warnings:

  - You are about to drop the column `emoji` on the `bulletin_reactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[post_id,user_id,type]` on the table `bulletin_reactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `bulletin_reactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "bulletin_reactions_post_id_user_id_emoji_key";

-- AlterTable
ALTER TABLE "bulletin_reactions" DROP COLUMN "emoji",
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'LIKE';

-- CreateIndex
CREATE INDEX "bulletin_reactions_tenant_id_idx" ON "bulletin_reactions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulletin_reactions_post_id_user_id_type_key" ON "bulletin_reactions"("post_id", "user_id", "type");

-- AddForeignKey
ALTER TABLE "bulletin_reactions" ADD CONSTRAINT "bulletin_reactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
