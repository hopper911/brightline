-- Mission Control ops expansion: enums, schedule fields, task–event link, stage history, notifications

-- Enum additions
ALTER TYPE "StudioTaskStatus" ADD VALUE 'WAITING';
ALTER TYPE "StudioTaskPriority" ADD VALUE 'CRITICAL';
ALTER TYPE "StudioScheduleEventKind" ADD VALUE 'MEETING';
ALTER TYPE "StudioScheduleEventKind" ADD VALUE 'REVIEW';
ALTER TYPE "StudioScheduleEventKind" ADD VALUE 'EDITING';
ALTER TYPE "StudioScheduleEventKind" ADD VALUE 'INTERNAL';
ALTER TYPE "StudioScheduleEventKind" ADD VALUE 'DELIVERY';

-- StudioScheduleEvent columns
ALTER TABLE "StudioScheduleEvent" ADD COLUMN "studioClientId" TEXT;
ALTER TABLE "StudioScheduleEvent" ADD COLUMN "remindAt" TIMESTAMP(3);
ALTER TABLE "StudioScheduleEvent" ADD COLUMN "calendarStatus" TEXT;
ALTER TABLE "StudioScheduleEvent" ADD COLUMN "colorToken" TEXT;

-- StudioTask -> optional calendar event
ALTER TABLE "StudioTask" ADD COLUMN "studioScheduleEventId" TEXT;

-- StudioProjectStageHistory
CREATE TABLE "StudioProjectStageHistory" (
    "id" TEXT NOT NULL,
    "studioProjectId" TEXT NOT NULL,
    "fromStatus" "ProjectStatus",
    "toStatus" "ProjectStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "actorNote" TEXT,
    "metadata" JSONB,

    CONSTRAINT "StudioProjectStageHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioProjectStageHistory_studioProjectId_changedAt_idx" ON "StudioProjectStageHistory"("studioProjectId", "changedAt");

ALTER TABLE "StudioProjectStageHistory" ADD CONSTRAINT "StudioProjectStageHistory_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StudioNotification
CREATE TABLE "StudioNotification" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioProjectId" TEXT,
    "studioTaskId" TEXT,
    "studioScheduleEventId" TEXT,
    "payload" JSONB,

    CONSTRAINT "StudioNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioNotification_readAt_idx" ON "StudioNotification"("readAt");
CREATE INDEX "StudioNotification_createdAt_idx" ON "StudioNotification"("createdAt");
CREATE INDEX "StudioNotification_studioProjectId_idx" ON "StudioNotification"("studioProjectId");
CREATE INDEX "StudioNotification_kind_idx" ON "StudioNotification"("kind");

ALTER TABLE "StudioNotification" ADD CONSTRAINT "StudioNotification_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioNotification" ADD CONSTRAINT "StudioNotification_studioTaskId_fkey" FOREIGN KEY ("studioTaskId") REFERENCES "StudioTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioNotification" ADD CONSTRAINT "StudioNotification_studioScheduleEventId_fkey" FOREIGN KEY ("studioScheduleEventId") REFERENCES "StudioScheduleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes + FKs for expanded schedule/task
CREATE INDEX "StudioScheduleEvent_studioClientId_idx" ON "StudioScheduleEvent"("studioClientId");
ALTER TABLE "StudioScheduleEvent" ADD CONSTRAINT "StudioScheduleEvent_studioClientId_fkey" FOREIGN KEY ("studioClientId") REFERENCES "StudioClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StudioTask_studioScheduleEventId_idx" ON "StudioTask"("studioScheduleEventId");
ALTER TABLE "StudioTask" ADD CONSTRAINT "StudioTask_studioScheduleEventId_fkey" FOREIGN KEY ("studioScheduleEventId") REFERENCES "StudioScheduleEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
