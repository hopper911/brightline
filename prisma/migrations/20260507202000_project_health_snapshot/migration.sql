CREATE TABLE "ProjectHealthSnapshot" (
    "id" TEXT NOT NULL,
    "studioProjectId" TEXT NOT NULL,
    "dateBucket" TIMESTAMP(3) NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "productionRiskScore" INTEGER NOT NULL,
    "deliveryReadinessScore" INTEGER NOT NULL,
    "profitabilityScore" INTEGER,
    "factors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectHealthSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectHealthSnapshot_studioProjectId_dateBucket_key" ON "ProjectHealthSnapshot"("studioProjectId", "dateBucket");
CREATE INDEX "ProjectHealthSnapshot_dateBucket_idx" ON "ProjectHealthSnapshot"("dateBucket");

ALTER TABLE "ProjectHealthSnapshot" ADD CONSTRAINT "ProjectHealthSnapshot_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
