import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const STUDIO_NOTIFICATION_KIND_TASK_DUE_SOON = "mission.task_due_soon";
export const STUDIO_NOTIFICATION_KIND_EVENT_UPCOMING = "mission.event_upcoming";

async function upsertUnreadNotification(input: {
  kind: string;
  title: string;
  body?: string | null;
  studioProjectId?: string | null;
  studioTaskId?: string | null;
  studioScheduleEventId?: string | null;
}) {
  const where: Prisma.StudioNotificationWhereInput = {
    kind: input.kind,
    readAt: null,
  };
  if (input.studioTaskId) {
    where.studioTaskId = input.studioTaskId;
  } else if (input.studioScheduleEventId) {
    where.studioScheduleEventId = input.studioScheduleEventId;
  } else {
    return;
  }

  const existing = await prisma.studioNotification.findFirst({ where });
  if (existing) {
    await prisma.studioNotification.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        body: input.body ?? null,
        studioProjectId: input.studioProjectId ?? null,
      },
    });
    return { action: "updated" as const, id: existing.id };
  }

  const row = await prisma.studioNotification.create({
    data: {
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      studioProjectId: input.studioProjectId ?? null,
      studioTaskId: input.studioTaskId ?? null,
      studioScheduleEventId: input.studioScheduleEventId ?? null,
    },
  });
  return { action: "created" as const, id: row.id };
}

/** Creates or refreshes unread Mission Control notifications for tasks due soon and upcoming events. */
export async function runStudioNotificationDigest(): Promise<{
  taskNotifications: number;
  eventNotifications: number;
}> {
  const now = new Date();
  const in3 = new Date(now);
  in3.setDate(in3.getDate() + 3);
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);

  const dueTasks = await prisma.studioTask.findMany({
    where: {
      status: { in: ["TODO", "IN_PROGRESS", "WAITING"] },
      dueAt: { gte: now, lte: in3 },
      parentTaskId: null,
    },
    include: { project: { select: { title: true } } },
  });

  let taskNotifications = 0;
  for (const t of dueTasks) {
    const title = `Task due soon: ${t.title}`;
    const body = t.project ? `Project: ${t.project.title}` : null;
    await upsertUnreadNotification({
      kind: STUDIO_NOTIFICATION_KIND_TASK_DUE_SOON,
      studioTaskId: t.id,
      studioProjectId: t.studioProjectId,
      title,
      body,
    });
    taskNotifications += 1;
  }

  const events = await prisma.studioScheduleEvent.findMany({
    where: { startsAt: { gte: now, lte: in7 } },
    include: { project: { select: { title: true } } },
  });

  let eventNotifications = 0;
  for (const e of events) {
    const title = `Upcoming: ${e.title}`;
    const body = [
      e.startsAt.toLocaleString(),
      e.project ? `Project: ${e.project.title}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    await upsertUnreadNotification({
      kind: STUDIO_NOTIFICATION_KIND_EVENT_UPCOMING,
      studioScheduleEventId: e.id,
      studioProjectId: e.studioProjectId,
      title,
      body,
    });
    eventNotifications += 1;
  }

  return { taskNotifications, eventNotifications };
}
