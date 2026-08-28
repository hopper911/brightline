-- Platform background jobs (Phase 7B)

CREATE TABLE "platform_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "tenantSlug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "platform_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_jobs_idempotencyKey_key" ON "platform_jobs"("idempotencyKey");

CREATE INDEX "platform_jobs_tenantSlug_status_createdAt_idx" ON "platform_jobs"("tenantSlug", "status", "createdAt");

CREATE INDEX "platform_jobs_type_status_idx" ON "platform_jobs"("type", "status");

ALTER TABLE "platform_jobs" ADD CONSTRAINT "platform_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "platform_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
