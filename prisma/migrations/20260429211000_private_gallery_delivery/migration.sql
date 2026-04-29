-- Add low-resolution derivative metadata for private client gallery downloads.
ALTER TABLE "GalleryImage"
ADD COLUMN "lowResStorageKey" TEXT,
ADD COLUMN "lowResWidth" INTEGER,
ADD COLUMN "lowResHeight" INTEGER,
ADD COLUMN "lowResBytes" INTEGER,
ADD COLUMN "highResWidth" INTEGER,
ADD COLUMN "highResHeight" INTEGER,
ADD COLUMN "highResBytes" INTEGER;

-- Store client-delivery videos separately from image proofing rows.
CREATE TABLE "GalleryVideo" (
  "id" TEXT NOT NULL,
  "galleryId" TEXT NOT NULL,
  "title" TEXT,
  "filename" TEXT,
  "storageKey" TEXT NOT NULL,
  "posterKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "allowDownload" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GalleryVideo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GalleryVideo_galleryId_idx" ON "GalleryVideo"("galleryId");

ALTER TABLE "GalleryVideo"
ADD CONSTRAINT "GalleryVideo_galleryId_fkey"
FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
