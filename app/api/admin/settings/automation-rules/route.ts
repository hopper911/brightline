import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const rules = await prisma.automationRule.findMany({
    orderBy: [{ isEnabled: "desc" }, { triggerEvent: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ ok: true, rules });
}

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const triggerEvent = typeof body.triggerEvent === "string" ? body.triggerEvent.trim() : "";
  if (!name || !triggerEvent) {
    return NextResponse.json(
      { ok: false, error: "name and triggerEvent are required." },
      { status: 400 }
    );
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  const isEnabled = body.isEnabled === false ? false : true;

  const rule = await prisma.automationRule.create({
    data: { name, triggerEvent, notes, isEnabled },
  });

  return NextResponse.json({ ok: true, rule });
}

