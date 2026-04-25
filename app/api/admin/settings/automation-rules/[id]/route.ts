import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const data: { name?: string; triggerEvent?: string; notes?: string | null; isEnabled?: boolean } = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.triggerEvent === "string" && body.triggerEvent.trim()) {
    data.triggerEvent = body.triggerEvent.trim();
  }
  if (body.notes === null) data.notes = null;
  if (typeof body.notes === "string") data.notes = body.notes.trim() || null;
  if (typeof body.isEnabled === "boolean") data.isEnabled = body.isEnabled;

  const rule = await prisma.automationRule.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true, rule });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  await prisma.automationRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

