-- AI ops audit log (structured invocations). Forward-compatible optional workspaceId for future multi-tenant.

CREATE TABLE "AiInvocation" (
    "id" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "modelUsed" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "projectId" TEXT,
    "workspaceId" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "inputHash" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInvocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiInvocation_taskType_createdAt_idx" ON "AiInvocation"("taskType", "createdAt");
CREATE INDEX "AiInvocation_projectId_createdAt_idx" ON "AiInvocation"("projectId", "createdAt");
CREATE INDEX "AiInvocation_promptId_promptVersion_idx" ON "AiInvocation"("promptId", "promptVersion");

ALTER TABLE "AiInvocation" ADD CONSTRAINT "AiInvocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
