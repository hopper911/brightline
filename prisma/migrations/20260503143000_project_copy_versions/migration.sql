-- CreateTable
CREATE TABLE "ProjectCopyVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "promptMode" TEXT NOT NULL,
    "tonePreset" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCopyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectCopyVersion_projectId_fieldKey_createdAt_idx" ON "ProjectCopyVersion"("projectId", "fieldKey", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectCopyVersion_projectId_createdAt_idx" ON "ProjectCopyVersion"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectCopyVersion" ADD CONSTRAINT "ProjectCopyVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
