-- Add optional per-project background media for public project and case study pages.
ALTER TABLE "WorkProject"
ADD COLUMN "backgroundMediaUrl" TEXT,
ADD COLUMN "backgroundPosterUrl" TEXT;

ALTER TABLE "StudioProject"
ADD COLUMN "backgroundMediaUrl" TEXT,
ADD COLUMN "backgroundPosterUrl" TEXT;
