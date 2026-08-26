-- AlterTable
ALTER TABLE "WorkProject" ADD COLUMN "galleryCarouselEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StudioProject" ADD COLUMN "galleryCarouselEnabled" BOOLEAN NOT NULL DEFAULT false;
