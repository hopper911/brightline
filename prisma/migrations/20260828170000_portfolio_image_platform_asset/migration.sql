-- Phase 4C: optional platform asset link on legacy portfolio images (additive only).

ALTER TABLE "PortfolioImage" ADD COLUMN IF NOT EXISTS "assetId" TEXT;

CREATE INDEX IF NOT EXISTS "PortfolioImage_assetId_idx" ON "PortfolioImage"("assetId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PortfolioImage_assetId_fkey'
  ) THEN
    ALTER TABLE "PortfolioImage"
      ADD CONSTRAINT "PortfolioImage_assetId_fkey"
      FOREIGN KEY ("assetId") REFERENCES "platform_assets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
