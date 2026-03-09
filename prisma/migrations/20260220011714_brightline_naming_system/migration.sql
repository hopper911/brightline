/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `GalleryAccessToken` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GalleryImage` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `PortfolioCategory` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PortfolioCategory` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `PortfolioImage` table. All the data in the column will be lost.
  - You are about to drop the column `alt` on the `ProjectImage` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ProjectImage` table. All the data in the column will be lost.
  - You are about to drop the column `storageKey` on the `ProjectImage` table. All the data in the column will be lost.
  - The primary key for the `ProjectTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `ProjectTag` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `ProjectTag` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the `ClientGalleryAccess` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `email` on table `Client` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `codeHash` to the `GalleryAccessToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codeHint` to the `GalleryAccessToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codeSalt` to the `GalleryAccessToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "GalleryAccessToken_galleryId_idx";

-- DropIndex
DROP INDEX "GalleryAccessToken_token_key";

-- DropIndex
DROP INDEX "GalleryImage_galleryId_sortOrder_idx";

-- DropIndex
DROP INDEX "PortfolioImage_projectId_sortOrder_idx";

-- DropIndex
DROP INDEX "PortfolioProject_slug_key";

-- DropIndex
DROP INDEX "ProjectImage_projectId_sortOrder_idx";

-- DropIndex
DROP INDEX "ProjectTag_projectId_tagId_key";

-- DropIndex
DROP INDEX "ProjectTag_tagId_idx";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "createdAt",
DROP COLUMN "phone",
DROP COLUMN "updatedAt",
DROP COLUMN "website",
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "Gallery" ADD COLUMN     "clientNotes" TEXT,
ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "GalleryAccessToken" DROP COLUMN "token",
ADD COLUMN     "allowDownload" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "codeHash" TEXT NOT NULL,
ADD COLUMN     "codeHint" TEXT NOT NULL,
ADD COLUMN     "codeSalt" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "maxDownloads" INTEGER;

-- AlterTable
ALTER TABLE "GalleryImage" DROP COLUMN "createdAt",
ADD COLUMN     "filename" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "availabilityEnd" TIMESTAMP(3),
ADD COLUMN     "availabilityStart" TIMESTAMP(3),
ADD COLUMN     "budget" TEXT,
ADD COLUMN     "contactedAt" TIMESTAMP(3),
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "service" TEXT,
ADD COLUMN     "shootType" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PortfolioCategory" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "PortfolioImage" DROP COLUMN "createdAt",
ADD COLUMN     "storageKey" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProjectImage" DROP COLUMN "alt",
DROP COLUMN "createdAt",
DROP COLUMN "storageKey",
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProjectTag" DROP CONSTRAINT "ProjectTag_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "id",
ADD CONSTRAINT "ProjectTag_pkey" PRIMARY KEY ("projectId", "tagId");

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "createdAt";

-- DropTable
DROP TABLE "ClientGalleryAccess";

-- CreateTable
CREATE TABLE "GalleryImageTag" (
    "imageId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "GalleryImageTag_pkey" PRIMARY KEY ("imageId","tagId")
);

-- CreateTable
CREATE TABLE "GalleryAccessLog" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT,
    "action" TEXT,
    "imageId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryFavorite" (
    "tokenId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "GalleryFavorite_pkey" PRIMARY KEY ("tokenId","imageId")
);

-- CreateTable
CREATE TABLE "GalleryDownload" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "imageId" TEXT,
    "type" TEXT,

    CONSTRAINT "GalleryDownload_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GalleryImageTag" ADD CONSTRAINT "GalleryImageTag_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "GalleryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImageTag" ADD CONSTRAINT "GalleryImageTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryAccessLog" ADD CONSTRAINT "GalleryAccessLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "GalleryAccessToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryFavorite" ADD CONSTRAINT "GalleryFavorite_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "GalleryAccessToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryDownload" ADD CONSTRAINT "GalleryDownload_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "GalleryAccessToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
