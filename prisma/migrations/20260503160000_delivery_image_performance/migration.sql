-- Delivery package image performance metrics.
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "downloadCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "totalViewDurationMs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "firstClickOrder" INTEGER;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "lastClickOrder" INTEGER;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "performanceScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "usageLikelihood" TEXT;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "performanceRecommendedPlacement" TEXT;

ALTER TABLE "PackageAccessLog" ADD COLUMN "deliveryPackageItemId" TEXT;
ALTER TABLE "PackageAccessLog" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "PackageAccessLog" ADD COLUMN "clickOrder" INTEGER;

CREATE INDEX "DeliveryPackageItem_performanceScore_idx" ON "DeliveryPackageItem"("performanceScore");
CREATE INDEX "DeliveryPackageItem_downloadCount_idx" ON "DeliveryPackageItem"("downloadCount");
CREATE INDEX "PackageAccessLog_deliveryPackageItemId_idx" ON "PackageAccessLog"("deliveryPackageItemId");

ALTER TABLE "PackageAccessLog" ADD CONSTRAINT "PackageAccessLog_deliveryPackageItemId_fkey" FOREIGN KEY ("deliveryPackageItemId") REFERENCES "DeliveryPackageItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
