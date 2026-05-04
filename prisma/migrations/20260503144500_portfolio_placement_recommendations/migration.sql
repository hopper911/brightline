-- AlterTable
ALTER TABLE "ProjectMedia" ADD COLUMN "recommendedPlacement" TEXT;
ALTER TABLE "ProjectMedia" ADD COLUMN "confidenceScore" INTEGER;
ALTER TABLE "ProjectMedia" ADD COLUMN "reason" TEXT;

-- CreateIndex
CREATE INDEX "ProjectMedia_projectId_recommendedPlacement_idx" ON "ProjectMedia"("projectId", "recommendedPlacement");
