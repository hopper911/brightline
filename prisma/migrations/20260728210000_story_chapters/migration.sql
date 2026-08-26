-- AlterTable
ALTER TABLE "WorkProject" ADD COLUMN IF NOT EXISTS "storyChapters" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "StudioProject" ADD COLUMN IF NOT EXISTS "storyChapters" JSONB NOT NULL DEFAULT '[]';
