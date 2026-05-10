-- CreateEnum
CREATE TYPE "StudioTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StudioTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "StudioScheduleEventKind" AS ENUM ('SHOOT', 'DEADLINE', 'REMINDER', 'TRAVEL', 'OTHER');

-- CreateTable
CREATE TABLE "StudioTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "StudioTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "StudioTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueAt" TIMESTAMP(3),
    "assigneeNote" TEXT,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "studioProjectId" TEXT,
    "studioClientId" TEXT,
    "parentTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioScheduleEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "kind" "StudioScheduleEventKind" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "studioProjectId" TEXT,
    "googleCalendarEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioScheduleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioTask_studioProjectId_idx" ON "StudioTask"("studioProjectId");

-- CreateIndex
CREATE INDEX "StudioTask_studioClientId_idx" ON "StudioTask"("studioClientId");

-- CreateIndex
CREATE INDEX "StudioTask_status_idx" ON "StudioTask"("status");

-- CreateIndex
CREATE INDEX "StudioTask_dueAt_idx" ON "StudioTask"("dueAt");

-- CreateIndex
CREATE INDEX "StudioTask_parentTaskId_idx" ON "StudioTask"("parentTaskId");

-- CreateIndex
CREATE INDEX "StudioScheduleEvent_startsAt_idx" ON "StudioScheduleEvent"("startsAt");

-- CreateIndex
CREATE INDEX "StudioScheduleEvent_studioProjectId_idx" ON "StudioScheduleEvent"("studioProjectId");

-- AddForeignKey
ALTER TABLE "StudioTask" ADD CONSTRAINT "StudioTask_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTask" ADD CONSTRAINT "StudioTask_studioClientId_fkey" FOREIGN KEY ("studioClientId") REFERENCES "StudioClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTask" ADD CONSTRAINT "StudioTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "StudioTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioScheduleEvent" ADD CONSTRAINT "StudioScheduleEvent_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
