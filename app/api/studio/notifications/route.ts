import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(100, Math.max(1, limitRaw ? parseInt(limitRaw, 10) : 40));

  const notifications = await prisma.studioNotification.findMany({
    where: unreadOnly ? { readAt: null } : {},
    orderBy: [{ createdAt: "desc" }],
    take: limit,
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

  return NextResponse.json({ ok: true, notifications });
}
