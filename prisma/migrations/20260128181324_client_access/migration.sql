-- AlterTable
ALTER TABLE "PortfolioProject" ADD COLUMN     "externalGalleryUrl" TEXT;

-- CreateTable
CREATE TABLE "ClientGalleryAccess" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "galleryUrl" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientGalleryAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientGalleryAccess_accessCode_key" ON "ClientGalleryAccess"("accessCode");
