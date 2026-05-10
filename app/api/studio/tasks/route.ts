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

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const status = searchParams.get("status") as StudioTaskStatus | null;
  const includeSubtasks = searchParams.get("includeSubtasks") === "true";

  const where: Prisma.StudioTaskWhereInput = {};
  if (projectId) where.studioProjectId = projectId;
  if (status) where.status = status;
  if (!includeSubtasks) where.parentTaskId = null;

  const tasks = await prisma.studioTask.findMany({
    where,
    include: taskInclude,
    orderBy: [{ sortOrder: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, tasks });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

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

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: "title is required." }, { status: 400 });
  }

  const dueAt =
    body?.dueAt != null && body.dueAt !== ""
      ? new Date(body.dueAt)
      : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid dueAt." }, { status: 400 });
  }

  const task = await prisma.studioTask.create({
    data: {
      title,
      description: body?.description?.trim() || null,
      status: body?.status ?? "TODO",
      priority: body?.priority ?? "MEDIUM",
      dueAt,
      assigneeNote: body?.assigneeNote?.trim() || null,
      labels: Array.isArray(body?.labels) ? body.labels.filter((l) => typeof l === "string") : [],
      sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
      studioProjectId: body?.studioProjectId || null,
      studioClientId: body?.studioClientId || null,
      parentTaskId: body?.parentTaskId || null,
      studioScheduleEventId: body?.studioScheduleEventId || null,
    },
    include: taskInclude,
  });

  return NextResponse.json({ ok: true, task });
}
