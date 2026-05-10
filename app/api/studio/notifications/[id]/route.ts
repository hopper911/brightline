import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json().catch(() => null)) as { read?: boolean } | null;

  if (!body || typeof body.read !== "boolean") {
    return NextResponse.json({ ok: false, error: 'Expected JSON body { "read": true|false }.' }, { status: 400 });
  }

  try {
    const notification = await prisma.studioNotification.update({
      where: { id },
      data: { readAt: body.read ? new Date() : null },
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
        studioProjectId: true,
        studioTaskId: true,
        studioScheduleEventId: true,
      },
    });
    return NextResponse.json({ ok: true, notification });
  } catch {
    return NextResponse.json({ ok: false, error: "Notification not found." }, { status: 404 });
  }
}
