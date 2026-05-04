import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { scheduleProjectFollowUps } from "@/lib/followups";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { projectId } = await context.params;
  try {
    const followUps = await scheduleProjectFollowUps(projectId);
    return NextResponse.json({ ok: true, followUps });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to schedule follow-ups." },
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { projectId } = await context.params;
  const body = await req.json().catch(() => null) as { action?: unknown; followUpId?: unknown; scheduledAt?: unknown } | null;
  const action = cleanText(body?.action);

  if (action === "cancel") {
    await prisma.followUpSchedule.updateMany({
      where: { projectId, status: "pending" },
      data: { status: "canceled", error: null },
    });
    const followUps = await prisma.followUpSchedule.findMany({
      where: { projectId },
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json({ ok: true, followUps });
  }

  if (action === "reschedule") {
    const followUpId = cleanText(body?.followUpId);
    const scheduledAtRaw = cleanText(body?.scheduledAt);
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
    if (!followUpId || !scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid reschedule request." }, { status: 400 });
    }
    await prisma.followUpSchedule.updateMany({
      where: { id: followUpId, projectId, status: { in: ["pending", "failed", "canceled"] } },
      data: { scheduledAt, status: "pending", sentAt: null, error: null },
    });
    const followUps = await prisma.followUpSchedule.findMany({
      where: { projectId },
      orderBy: { scheduledAt: "asc" },
    });
    return NextResponse.json({ ok: true, followUps });
  }

  return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
}

