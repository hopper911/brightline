-- Mission Control advanced layer: activity log, webhook audit, media intelligence fields

ALTER TABLE "MediaAsset" ADD COLUMN     "fileSizeBytes" INTEGER,
ADD COLUMN     "orientation" "MediaOrientation",
ADD COLUMN     "fileFormat" TEXT,
ADD COLUMN     "caption" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "heroCandidate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portfolioCandidate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clientApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "internalRating" INTEGER;

CREATE INDEX "MediaAsset_orientation_idx" ON "MediaAsset"("orientation");

CREATE INDEX "MediaAsset_portfolioCandidate_idx" ON "MediaAsset"("portfolioCandidate");

CREATE INDEX "MediaAsset_heroCandidate_idx" ON "MediaAsset"("heroCandidate");

CREATE TABLE "StudioActivityLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "studioClientId" TEXT,
    "studioProjectId" TEXT,
    "studioTaskId" TEXT,
    "studioInvoiceId" TEXT,
    "studioGalleryId" TEXT,
    "deliveryPackageId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioWebhookLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "payload" JSONB,
    "httpStatus" INTEGER,
    "errorMessage" TEXT,
    "source" TEXT NOT NULL DEFAULT 'automation_api',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioWebhookLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioActivityLog_studioProjectId_createdAt_idx" ON "StudioActivityLog"("studioProjectId", "createdAt");

CREATE INDEX "StudioActivityLog_studioClientId_createdAt_idx" ON "StudioActivityLog"("studioClientId", "createdAt");

CREATE INDEX "StudioActivityLog_type_createdAt_idx" ON "StudioActivityLog"("type", "createdAt");

CREATE INDEX "StudioActivityLog_createdAt_idx" ON "StudioActivityLog"("createdAt");

CREATE INDEX "StudioWebhookLog_eventType_createdAt_idx" ON "StudioWebhookLog"("eventType", "createdAt");

CREATE INDEX "StudioWebhookLog_idempotencyKey_idx" ON "StudioWebhookLog"("idempotencyKey");

ALTER TABLE "StudioActivityLog" ADD CONSTRAINT "StudioActivityLog_studioClientId_fkey" FOREIGN KEY ("studioClientId") REFERENCES "StudioClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudioActivityLog" ADD CONSTRAINT "StudioActivityLog_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioActivityLog" ADD CONSTRAINT "StudioActivityLog_studioTaskId_fkey" FOREIGN KEY ("studioTaskId") REFERENCES "StudioTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioActivityLog" ADD CONSTRAINT "StudioActivityLog_studioInvoiceId_fkey" FOREIGN KEY ("studioInvoiceId") REFERENCES "StudioInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudioActivityLog" ADD CONSTRAINT "StudioActivityLog_studioGalleryId_fkey" FOREIGN KEY ("studioGalleryId") REFERENCES "StudioGallery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudioActivityLog" ADD CONSTRAINT "StudioActivityLog_deliveryPackageId_fkey" FOREIGN KEY ("deliveryPackageId") REFERENCES "DeliveryPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
