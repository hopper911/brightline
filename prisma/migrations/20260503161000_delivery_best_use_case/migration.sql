-- Persist AI best-use-case recommendations for delivery package images.
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "aiBestUseCase" TEXT;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "aiUseCaseConfidence" INTEGER;
ALTER TABLE "DeliveryPackageItem" ADD COLUMN "aiUseCaseReasoning" TEXT;

CREATE INDEX "DeliveryPackageItem_aiBestUseCase_idx" ON "DeliveryPackageItem"("aiBestUseCase");
