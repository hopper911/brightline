-- Recovery: some Neon branches marked the prior migration applied without adding every column.
ALTER TABLE "Gallery" ADD COLUMN IF NOT EXISTS "status" "GalleryStatus" NOT NULL DEFAULT 'SENT';

-- AlterTable
ALTER TABLE "Gallery" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
