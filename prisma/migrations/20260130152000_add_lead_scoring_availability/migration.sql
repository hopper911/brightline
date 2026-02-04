-- AlterTable
ALTER TABLE "Lead"
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'inquiry',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'new',
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "service" TEXT,
ADD COLUMN     "budget" TEXT,
ADD COLUMN     "availabilityStart" TIMESTAMP(3),
ADD COLUMN     "availabilityEnd" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "shootType" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "contactedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
