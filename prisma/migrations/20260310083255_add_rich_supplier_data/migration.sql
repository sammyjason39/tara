-- AlterTable
ALTER TABLE "supplier_branches" ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_person" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "full_address" TEXT;

-- AlterTable
ALTER TABLE "supplier_masters" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_person" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "website" TEXT;
