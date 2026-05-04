-- Reusable Studio OS project templates.
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "defaultFields" JSONB NOT NULL,
    "defaultTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "defaultDeliveryStructure" JSONB NOT NULL,
    "defaultAISettings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectTemplate_pillar_idx" ON "ProjectTemplate"("pillar");
CREATE INDEX "ProjectTemplate_name_idx" ON "ProjectTemplate"("name");
