-- AlterTable
ALTER TABLE "WorkProject" ADD COLUMN     "approach" TEXT,
ADD COLUMN     "closing" TEXT,
ADD COLUMN     "context" TEXT,
ADD COLUMN     "execution" TEXT,
ADD COLUMN     "highlight" TEXT,
ADD COLUMN     "opening" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
