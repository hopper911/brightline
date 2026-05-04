-- Extend existing invoice status enum for client package lifecycle.
ALTER TYPE "StudioInvoiceStatus" ADD VALUE IF NOT EXISTS 'VIEWED';
ALTER TYPE "StudioInvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELED';

-- Extend invoices so existing Studio OS invoices can attach to final packages and store generated PDFs.
ALTER TABLE "StudioInvoice" ADD COLUMN "deliveryPackageId" TEXT;
ALTER TABLE "StudioInvoice" ADD COLUMN "paymentInstructions" TEXT;
ALTER TABLE "StudioInvoice" ADD COLUMN "pdfStorageKey" TEXT;

-- Persistent record of meaningful AI outputs.
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldKey" TEXT,
    "generationType" TEXT NOT NULL,
    "promptMode" TEXT,
    "tonePreset" TEXT,
    "inputBrief" JSONB,
    "outputText" TEXT,
    "outputJSON" JSONB,
    "modelUsed" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- Durable final-package record. Access token is the only client-facing lookup key.
CREATE TABLE "DeliveryPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "manifestJSON" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryPackageItem" (
    "id" TEXT NOT NULL,
    "deliveryPackageId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "deliveryGroup" TEXT NOT NULL DEFAULT 'archive',
    "usageSuggestion" TEXT,
    "clientFacingCaption" TEXT,
    "aiDescription" TEXT,
    "altText" TEXT,
    "imagePurpose" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "selectedForDelivery" BOOLEAN NOT NULL DEFAULT true,
    "downloadUrl" TEXT,
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPackageItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PackageAccessLog" (
    "id" TEXT NOT NULL,
    "deliveryPackageId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryPackage_accessToken_key" ON "DeliveryPackage"("accessToken");
CREATE INDEX "AiGeneration_projectId_generationType_createdAt_idx" ON "AiGeneration"("projectId", "generationType", "createdAt");
CREATE INDEX "AiGeneration_fieldKey_idx" ON "AiGeneration"("fieldKey");
CREATE INDEX "DeliveryPackage_projectId_idx" ON "DeliveryPackage"("projectId");
CREATE INDEX "DeliveryPackage_clientId_idx" ON "DeliveryPackage"("clientId");
CREATE INDEX "DeliveryPackage_status_idx" ON "DeliveryPackage"("status");
CREATE INDEX "DeliveryPackage_deliveryDate_idx" ON "DeliveryPackage"("deliveryDate");
CREATE UNIQUE INDEX "DeliveryPackageItem_deliveryPackageId_mediaAssetId_key" ON "DeliveryPackageItem"("deliveryPackageId", "mediaAssetId");
CREATE INDEX "DeliveryPackageItem_deliveryPackageId_deliveryGroup_idx" ON "DeliveryPackageItem"("deliveryPackageId", "deliveryGroup");
CREATE INDEX "DeliveryPackageItem_mediaAssetId_idx" ON "DeliveryPackageItem"("mediaAssetId");
CREATE INDEX "DeliveryPackageItem_selectedForDelivery_idx" ON "DeliveryPackageItem"("selectedForDelivery");
CREATE INDEX "PackageAccessLog_deliveryPackageId_createdAt_idx" ON "PackageAccessLog"("deliveryPackageId", "createdAt");
CREATE INDEX "PackageAccessLog_eventType_idx" ON "PackageAccessLog"("eventType");
CREATE INDEX "StudioInvoice_deliveryPackageId_idx" ON "StudioInvoice"("deliveryPackageId");

ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryPackage" ADD CONSTRAINT "DeliveryPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryPackage" ADD CONSTRAINT "DeliveryPackage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "StudioClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryPackageItem" ADD CONSTRAINT "DeliveryPackageItem_deliveryPackageId_fkey" FOREIGN KEY ("deliveryPackageId") REFERENCES "DeliveryPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryPackageItem" ADD CONSTRAINT "DeliveryPackageItem_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageAccessLog" ADD CONSTRAINT "PackageAccessLog_deliveryPackageId_fkey" FOREIGN KEY ("deliveryPackageId") REFERENCES "DeliveryPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioInvoice" ADD CONSTRAINT "StudioInvoice_deliveryPackageId_fkey" FOREIGN KEY ("deliveryPackageId") REFERENCES "DeliveryPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
