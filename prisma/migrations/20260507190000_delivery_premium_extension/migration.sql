-- DeliveryPackage: client-facing fields + optional public slug
ALTER TABLE "DeliveryPackage" ADD COLUMN "usageRights" TEXT;
ALTER TABLE "DeliveryPackage" ADD COLUMN "deliveryMessage" TEXT;
ALTER TABLE "DeliveryPackage" ADD COLUMN "publicSlug" TEXT;

CREATE UNIQUE INDEX "DeliveryPackage_publicSlug_key" ON "DeliveryPackage"("publicSlug");

-- DeliveryPackageItem: variant rows for multi-preset exports
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "variantKey" TEXT NOT NULL DEFAULT '';

DROP INDEX "DeliveryPackageItem_deliveryPackageId_mediaAssetId_key";

CREATE UNIQUE INDEX "DeliveryPackageItem_deliveryPackageId_mediaAssetId_variantKey_key" ON "DeliveryPackageItem"("deliveryPackageId", "mediaAssetId", "variantKey");
