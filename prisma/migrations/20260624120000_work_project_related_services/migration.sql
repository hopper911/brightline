-- AlterTable
ALTER TABLE "WorkProject" ADD COLUMN "relatedServicesEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "WorkProject" ADD COLUMN "relatedServicesIntro" TEXT;
ALTER TABLE "WorkProject" ADD COLUMN "relatedServicesLinks" JSONB;
ALTER TABLE "WorkProject" ADD COLUMN "showRelatedContactButton" BOOLEAN NOT NULL DEFAULT true;
