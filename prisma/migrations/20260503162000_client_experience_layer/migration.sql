-- Client experience layer: marketing exports, strategy reports, licensing, and feedback.
ALTER TABLE "DeliveryPackage" ADD COLUMN "marketingExportJSON" JSONB;
ALTER TABLE "DeliveryPackage" ADD COLUMN "visualStrategyReportJSON" JSONB;

ALTER TABLE "DeliveryPackageItem" ADD COLUMN "licensedUsageTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "licensingNotes" TEXT;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "licenseExpiresAt" TIMESTAMP(3);

CREATE TABLE "DeliveryPackageItemFeedback" (
    "id" TEXT NOT NULL,
    "deliveryPackageId" TEXT NOT NULL,
    "deliveryPackageItemId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryPackageItemFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeliveryPackageItemFeedback_deliveryPackageId_createdAt_idx" ON "DeliveryPackageItemFeedback"("deliveryPackageId", "createdAt");
CREATE INDEX "DeliveryPackageItemFeedback_deliveryPackageItemId_idx" ON "DeliveryPackageItemFeedback"("deliveryPackageItemId");
CREATE INDEX "DeliveryPackageItemFeedback_eventType_idx" ON "DeliveryPackageItemFeedback"("eventType");

ALTER TABLE "DeliveryPackageItemFeedback" ADD CONSTRAINT "DeliveryPackageItemFeedback_deliveryPackageId_fkey" FOREIGN KEY ("deliveryPackageId") REFERENCES "DeliveryPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryPackageItemFeedback" ADD CONSTRAINT "DeliveryPackageItemFeedback_deliveryPackageItemId_fkey" FOREIGN KEY ("deliveryPackageItemId") REFERENCES "DeliveryPackageItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
