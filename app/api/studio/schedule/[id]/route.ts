import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, StudioScheduleEventKind } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventInclude = {
  project: { select: { id: true, title: true, slug: true } },
  client: { select: { id: true, companyName: true } },
} satisfies Prisma.StudioScheduleEventInclude;

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
    startsAt?: string;
    endsAt?: string | null;
    allDay?: boolean;
    kind?: StudioScheduleEventKind;
    location?: string | null;
    studioProjectId?: string | null;
    googleCalendarEventId?: string | null;
    studioClientId?: string | null;
    remindAt?: string | null;
    calendarStatus?: string | null;
    colorToken?: string | null;
  } | null;

  const existing = await prisma.studioScheduleEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const data: Prisma.StudioScheduleEventUpdateInput = {};

  if (body?.title !== undefined) {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ ok: false, error: "title cannot be empty." }, { status: 400 });
    data.title = t;
  }
  if (body?.description !== undefined) data.description = body.description?.trim() || null;
  if (body?.kind !== undefined) data.kind = body.kind;
  if (body?.allDay !== undefined) data.allDay = body.allDay;
  if (body?.location !== undefined) data.location = body.location?.trim() || null;
  if (body?.googleCalendarEventId !== undefined) {
    data.googleCalendarEventId = body.googleCalendarEventId?.trim() || null;
  }

  if (body?.colorToken !== undefined) data.colorToken = body.colorToken?.trim() || null;
  if (body?.calendarStatus !== undefined) {
    data.calendarStatus = body.calendarStatus?.trim() || null;
  }
  if (body?.remindAt !== undefined) {
    if (body.remindAt === null || body.remindAt === "") {
      data.remindAt = null;
    } else {
      const r = new Date(body.remindAt);
      if (Number.isNaN(r.getTime())) {
        return NextResponse.json({ ok: false, error: "Invalid remindAt." }, { status: 400 });
      }
      data.remindAt = r;
    }
  }

  if (body?.startsAt !== undefined) {
    const s = new Date(body.startsAt);
    if (Number.isNaN(s.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid startsAt." }, { status: 400 });
    }
    data.startsAt = s;
  }

  if (body?.endsAt !== undefined) {
    if (body.endsAt === null || body.endsAt === "") {
      data.endsAt = null;
    } else {
      const e = new Date(body.endsAt);
      if (Number.isNaN(e.getTime())) {
        return NextResponse.json({ ok: false, error: "Invalid endsAt." }, { status: 400 });
      }
      data.endsAt = e;
    }
  }

  if (body?.studioProjectId !== undefined) {
    data.studioProjectId = body.studioProjectId || null;
  }
  if (body?.studioClientId !== undefined) {
    data.studioClientId = body.studioClientId || null;
  }

  const event = await prisma.studioScheduleEvent.update({
    where: { id },
    data,
    include: eventInclude,
  });

  return NextResponse.json({ ok: true, event });
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
    await prisma.studioScheduleEvent.delete({ where: { id } });
  } catch {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
