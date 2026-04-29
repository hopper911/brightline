-- Add delivery metadata to the existing token-backed gallery model.
ALTER TABLE "Gallery" ADD COLUMN "deliveryDriveLink" TEXT;
ALTER TABLE "Gallery" ADD COLUMN "usageGuideText" TEXT;
ALTER TABLE "Gallery" ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- Track Studio OS follow-up after final delivery.
ALTER TABLE "StudioProject" ADD COLUMN "followUpAt" TIMESTAMP(3);

CREATE INDEX "Gallery_deliveredAt_idx" ON "Gallery"("deliveredAt");
CREATE INDEX "StudioProject_followUpAt_idx" ON "StudioProject"("followUpAt");
