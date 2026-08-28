import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, StudioTaskPriority, StudioTaskStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const taskInclude = {
  project: { select: { id: true, title: true, slug: true } },
  client: { select: { id: true, companyName: true } },
  scheduleEvent: { select: { id: true, title: true, startsAt: true } },
} satisfies Prisma.StudioTaskInclude;

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    status?: StudioTaskStatus;
    priority?: StudioTaskPriority;
    dueAt?: string | null;
    assigneeNote?: string | null;
    labels?: string[];
    sortOrder?: number;
    studioProjectId?: string | null;
    studioClientId?: string | null;
    parentTaskId?: string | null;
    studioScheduleEventId?: string | null;
  } | null;

  const existing = await prisma.studioTask.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Task not found." }, { status: 404 });
  }

  const data: Prisma.StudioTaskUncheckedUpdateInput = {};

  if (body?.title !== undefined) {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ ok: false, error: "title cannot be empty." }, { status: 400 });
    data.title = t;
  }
  if (body?.description !== undefined) data.description = body.description?.trim() || null;
  if (body?.status !== undefined) data.status = body.status;
  if (body?.priority !== undefined) data.priority = body.priority;
  if (body?.assigneeNote !== undefined) data.assigneeNote = body.assigneeNote?.trim() || null;
  if (body?.labels !== undefined) {
    data.labels = Array.isArray(body.labels) ? body.labels.filter((l) => typeof l === "string") : [];
  }
  if (body?.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  if (body?.dueAt !== undefined) {
    if (body.dueAt === null || body.dueAt === "") {
      data.dueAt = null;
    } else {
      const d = new Date(body.dueAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, error: "Invalid dueAt." }, { status: 400 });
      }
      data.dueAt = d;
    }
  }

  if (body?.studioProjectId !== undefined) {
    data.studioProjectId = body.studioProjectId || null;
  }
  if (body?.studioClientId !== undefined) {
    data.studioClientId = body.studioClientId || null;
  }
  if (body?.parentTaskId !== undefined) {
    data.parentTaskId = body.parentTaskId || null;
  }
  if (body?.studioScheduleEventId !== undefined) {
    data.studioScheduleEventId = body.studioScheduleEventId || null;
  }

  const task = await prisma.studioTask.update({
    where: { id },
    data,
    include: taskInclude,
  });

  return NextResponse.json({ ok: true, task });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await prisma.studioTask.delete({ where: { id } });
  } catch {
    return NextResponse.json({ ok: false, error: "Task not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
