-- Platform audit events (Phase 2A): additive operational audit trail.
-- Optional FK to platform_tenants; no changes to legacy tables.

CREATE TABLE "platform_audit_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "tenantSlug" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_audit_events_tenantSlug_createdAt_idx" ON "platform_audit_events"("tenantSlug", "createdAt");

CREATE INDEX "platform_audit_events_action_createdAt_idx" ON "platform_audit_events"("action", "createdAt");

CREATE INDEX "platform_audit_events_resourceType_resourceId_idx" ON "platform_audit_events"("resourceType", "resourceId");

CREATE INDEX "platform_audit_events_createdAt_idx" ON "platform_audit_events"("createdAt");

ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "platform_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
