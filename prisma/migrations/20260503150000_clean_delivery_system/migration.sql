-- AlterTable
ALTER TABLE "WorkProject" ADD COLUMN "finalPackageToken" TEXT;
ALTER TABLE "WorkProject" ADD COLUMN "attachedInvoiceId" TEXT;
ALTER TABLE "WorkProject" ADD COLUMN "clientPdfGeneratedAt" TIMESTAMP(3);
ALTER TABLE "WorkProject" ADD COLUMN "deliveryPreparedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectMedia" ADD COLUMN "deliveryGroup" TEXT;
ALTER TABLE "ProjectMedia" ADD COLUMN "usageSuggestion" TEXT;
ALTER TABLE "ProjectMedia" ADD COLUMN "clientFacingCaption" TEXT;
ALTER TABLE "ProjectMedia" ADD COLUMN "aiDescription" TEXT;
ALTER TABLE "ProjectMedia" ADD COLUMN "fileFormat" TEXT;
ALTER TABLE "ProjectMedia" ADD COLUMN "imagePurpose" TEXT;
ALTER TABLE "ProjectMedia" ADD COLUMN "selectedForDelivery" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "WorkProject_finalPackageToken_key" ON "WorkProject"("finalPackageToken");

-- CreateIndex
CREATE INDEX "WorkProject_attachedInvoiceId_idx" ON "WorkProject"("attachedInvoiceId");

-- CreateIndex
CREATE INDEX "ProjectMedia_projectId_deliveryGroup_idx" ON "ProjectMedia"("projectId", "deliveryGroup");

-- CreateIndex
CREATE INDEX "ProjectMedia_projectId_selectedForDelivery_idx" ON "ProjectMedia"("projectId", "selectedForDelivery");
