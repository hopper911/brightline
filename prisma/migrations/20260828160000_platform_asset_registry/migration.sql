-- Platform asset registry (Phase 4A): additive stable media identity table.
-- No backfill; no FKs to legacy GalleryImage / MediaAsset / domain tables.

CREATE TYPE "PlatformStorageProvider" AS ENUM ('R2');

CREATE TYPE "PlatformAssetVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

CREATE TABLE "platform_assets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "PlatformStorageProvider" NOT NULL DEFAULT 'R2',
    "vault" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "visibility" "PlatformAssetVisibility" NOT NULL DEFAULT 'PRIVATE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_assets_provider_bucket_objectKey_key" ON "platform_assets"("provider", "bucket", "objectKey");

CREATE INDEX "platform_assets_tenantId_createdAt_idx" ON "platform_assets"("tenantId", "createdAt");

ALTER TABLE "platform_assets" ADD CONSTRAINT "platform_assets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "platform_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
