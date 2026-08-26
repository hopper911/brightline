-- CreateTable
CREATE TABLE "SiteBackgroundVideo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "webStorageKey" TEXT,
    "posterKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "durationSec" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteBackgroundVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteBackgroundVideo_slug_key" ON "SiteBackgroundVideo"("slug");

-- CreateIndex
CREATE INDEX "SiteBackgroundVideo_isActive_enabled_idx" ON "SiteBackgroundVideo"("isActive", "enabled");

-- CreateIndex
CREATE INDEX "SiteBackgroundVideo_sortOrder_idx" ON "SiteBackgroundVideo"("sortOrder");
