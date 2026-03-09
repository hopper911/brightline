-- AlterTable
ALTER TABLE "GalleryImage" ADD COLUMN "thumbUrl" TEXT, ADD COLUMN "fullUrl" TEXT, ADD COLUMN "isHero" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PortfolioImage" ADD COLUMN "thumbUrl" TEXT, ADD COLUMN "fullUrl" TEXT, ADD COLUMN "isHero" BOOLEAN NOT NULL DEFAULT false;
