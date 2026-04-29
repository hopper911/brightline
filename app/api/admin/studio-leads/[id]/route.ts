import { NextResponse } from "next/server";
import type { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const lead = await prisma.studioLead.findUnique({
    where: { id },
    include: {
      convertedClient: { select: { id: true, companyName: true } },
      convertedProject: { select: { id: true, title: true, slug: true } },
    },
  });

  if (!lead) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lead });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const existing = await prisma.studioLead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const data: Prisma.StudioLeadUncheckedUpdateInput = {};

  const optStr = (k: keyof Prisma.StudioLeadUncheckedUpdateInput, v: unknown) => {
    if (v === undefined) return;
    if (v === null) {
      (data as Record<string, unknown>)[k as string] = null;
      return;
    }
    if (typeof v === "string") {
      const t = v.trim();
      (data as Record<string, unknown>)[k as string] = t || null;
    }
  };

  optStr("name", body.name);
  optStr("company", body.company);
  optStr("email", body.email);
  optStr("phone", body.phone);
  optStr("inquirySource", body.inquirySource);
  optStr("serviceType", body.serviceType);
  optStr("budgetRange", body.budgetRange);
  optStr("timeline", body.timeline);
  optStr("message", body.message);
  optStr("notes", body.notes);

  if (typeof body.status === "string" && body.status.trim()) {
    data.status = body.status.trim() as LeadStatus;
  }

  if (body.followUpDate === null) {
    data.followUpDate = null;
  } else if (typeof body.followUpDate === "string" && body.followUpDate.trim()) {
    const d = new Date(body.followUpDate);
    if (!Number.isNaN(d.getTime())) data.followUpDate = d;
  }

  // Allow manual linking (optional).
  if (body.convertedClientId === null) data.convertedClientId = null;
  if (typeof body.convertedClientId === "string") {
    data.convertedClientId = body.convertedClientId.trim() || null;
  }
  if (body.convertedProjectId === null) data.convertedProjectId = null;
  if (typeof body.convertedProjectId === "string") {
    data.convertedProjectId = body.convertedProjectId.trim() || null;
  }

  const lead = await prisma.studioLead.update({
    where: { id },
    data,
    include: {
      convertedClient: { select: { id: true, companyName: true } },
      convertedProject: { select: { id: true, title: true, slug: true } },
    },
  });

  return NextResponse.json({ ok: true, lead });
}

