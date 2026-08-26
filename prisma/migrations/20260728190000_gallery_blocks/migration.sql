-- AlterTable
ALTER TABLE "WorkProject" ADD COLUMN IF NOT EXISTS "galleryBlocks" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "StudioProject" ADD COLUMN IF NOT EXISTS "galleryBlocks" JSONB NOT NULL DEFAULT '[]';

-- Migrate WorkProject: carousel flag → one carousel block; else one grid block when media exists
UPDATE "WorkProject" wp
SET "galleryBlocks" = CASE
  WHEN wp."galleryCarouselEnabled" = true THEN
    '[{"id":"migrated_carousel","type":"carousel","title":"","itemIds":[]}]'::jsonb
  WHEN EXISTS (SELECT 1 FROM "ProjectMedia" pm WHERE pm."projectId" = wp.id) THEN
    '[{"id":"migrated_grid","type":"grid","title":"","itemIds":[]}]'::jsonb
  ELSE '[]'::jsonb
END
WHERE wp."galleryBlocks" = '[]'::jsonb OR wp."galleryBlocks" IS NULL;

-- Migrate StudioProject similarly (gallery JSON array length)
UPDATE "StudioProject" sp
SET "galleryBlocks" = CASE
  WHEN sp."galleryCarouselEnabled" = true THEN
    '[{"id":"migrated_carousel","type":"carousel","title":"","itemIds":[]}]'::jsonb
  WHEN jsonb_typeof(sp.gallery) = 'array' AND jsonb_array_length(sp.gallery) > 0 THEN
    '[{"id":"migrated_grid","type":"grid","title":"","itemIds":[]}]'::jsonb
  ELSE '[]'::jsonb
END
WHERE sp."galleryBlocks" = '[]'::jsonb OR sp."galleryBlocks" IS NULL;
