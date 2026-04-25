-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "galleryType" "GalleryType" NOT NULL DEFAULT 'PROOF',
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "status" "GalleryStatus" NOT NULL DEFAULT 'SENT';

-- AlterTable
ALTER TABLE "GalleryAccessToken" ADD COLUMN     "selectionsSubmittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GalleryImageSelection" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryImageSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryImageSelection_tokenId_idx" ON "GalleryImageSelection"("tokenId");

-- CreateIndex
CREATE INDEX "GalleryImageSelection_imageId_idx" ON "GalleryImageSelection"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryImageSelection_tokenId_imageId_key" ON "GalleryImageSelection"("tokenId", "imageId");

-- CreateIndex
CREATE INDEX "Gallery_status_idx" ON "Gallery"("status");

-- CreateIndex
CREATE INDEX "Gallery_galleryType_idx" ON "Gallery"("galleryType");

-- AddForeignKey
ALTER TABLE "GalleryImageSelection" ADD CONSTRAINT "GalleryImageSelection_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "GalleryAccessToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImageSelection" ADD CONSTRAINT "GalleryImageSelection_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "GalleryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
