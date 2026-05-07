CREATE TABLE "EngagementEvent" (
    "id" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "studioProjectId" TEXT,
    "deliveryPackageId" TEXT,
    "deliveryPackageItemId" TEXT,
    "galleryId" TEXT,
    "galleryAccessTokenId" TEXT,
    "imageId" TEXT,
    "durationMs" INTEGER,
    "clickOrder" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EngagementEvent_surface_createdAt_idx" ON "EngagementEvent"("surface", "createdAt");
CREATE INDEX "EngagementEvent_eventType_createdAt_idx" ON "EngagementEvent"("eventType", "createdAt");
CREATE INDEX "EngagementEvent_studioProjectId_createdAt_idx" ON "EngagementEvent"("studioProjectId", "createdAt");
CREATE INDEX "EngagementEvent_deliveryPackageId_createdAt_idx" ON "EngagementEvent"("deliveryPackageId", "createdAt");
CREATE INDEX "EngagementEvent_galleryId_createdAt_idx" ON "EngagementEvent"("galleryId", "createdAt");
