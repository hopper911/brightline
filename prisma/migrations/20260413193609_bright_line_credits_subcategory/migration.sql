-- AlterTable
ALTER TABLE "StudioProject" ADD COLUMN     "credits" TEXT,
ADD COLUMN     "subcategory" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkProject" ADD COLUMN     "credits" TEXT;
