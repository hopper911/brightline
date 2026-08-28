-- Phase 11E: Drop unwired Lead ↔ StudioLead bridge columns (never populated in app or production).
-- Legacy Lead admin/API retired; StudioLead is the canonical pipeline.

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_studioLeadId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Lead_studioLeadId_key";
DROP INDEX IF EXISTS "Lead_studioLeadId_idx";
DROP INDEX IF EXISTS "StudioLead_legacyLeadId_key";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "studioLeadId";
ALTER TABLE "StudioLead" DROP COLUMN IF EXISTS "legacyLeadId";
