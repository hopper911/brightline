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

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : new Date();
  if (Number.isNaN(from.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid from." }, { status: 400 });
  }

  const to = toParam
    ? new Date(toParam)
    : new Date(from.getTime() + 120 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(to.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid to." }, { status: 400 });
  }

  const events = await prisma.studioScheduleEvent.findMany({
    where: {
      startsAt: { gte: from, lte: to },
    },
    include: eventInclude,
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ ok: true, events, range: { from: from.toISOString(), to: to.toISOString() } });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

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

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: "title is required." }, { status: 400 });
  }

  if (!body?.startsAt) {
    return NextResponse.json({ ok: false, error: "startsAt is required." }, { status: 400 });
  }

  const startsAt = new Date(body.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid startsAt." }, { status: 400 });
  }

  let endsAt: Date | null = null;
  if (body.endsAt != null && body.endsAt !== "") {
    endsAt = new Date(body.endsAt);
    if (Number.isNaN(endsAt.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid endsAt." }, { status: 400 });
    }
  }

  let remindAt: Date | null = null;
  if (body.remindAt != null && body.remindAt !== "") {
    remindAt = new Date(body.remindAt);
    if (Number.isNaN(remindAt.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid remindAt." }, { status: 400 });
    }
  }

  const event = await prisma.studioScheduleEvent.create({
    data: {
      title,
      description: body?.description?.trim() || null,
      startsAt,
      endsAt,
      allDay: Boolean(body?.allDay),
      kind: body?.kind ?? "OTHER",
      location: body?.location?.trim() || null,
      studioProjectId: body?.studioProjectId || null,
      studioClientId: body?.studioClientId || null,
      remindAt,
      calendarStatus: body?.calendarStatus?.trim() || null,
      colorToken: body?.colorToken?.trim() || null,
      googleCalendarEventId: body?.googleCalendarEventId?.trim() || null,
    },
    include: eventInclude,
  });

  return NextResponse.json({ ok: true, event });
}
