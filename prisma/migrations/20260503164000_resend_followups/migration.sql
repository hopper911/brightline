-- Automated Resend follow-up schedule after client delivery.
CREATE TABLE "FollowUpSchedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FollowUpSchedule_projectId_type_key" ON "FollowUpSchedule"("projectId", "type");
CREATE INDEX "FollowUpSchedule_projectId_status_idx" ON "FollowUpSchedule"("projectId", "status");
CREATE INDEX "FollowUpSchedule_clientId_idx" ON "FollowUpSchedule"("clientId");
CREATE INDEX "FollowUpSchedule_status_scheduledAt_idx" ON "FollowUpSchedule"("status", "scheduledAt");
CREATE INDEX "FollowUpSchedule_scheduledAt_idx" ON "FollowUpSchedule"("scheduledAt");

ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "StudioClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
