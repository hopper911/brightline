import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseConverted(param: string | null): boolean | undefined {
  if (param === "true") return true;
  if (param === "false") return false;
  return undefined;
}

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const converted = parseConverted(searchParams.get("converted"));

  const where: Prisma.StudioLeadWhereInput = {};

  if (status) {
    where.status = status as Prisma.LeadStatus;
  }

  if (converted !== undefined) {
    where.convertedProjectId = converted ? { not: null } : null;
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.studioLead.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: {
      convertedClient: { select: { id: true, companyName: true } },
      convertedProject: { select: { id: true, title: true, slug: true } },
    },
  });

  return NextResponse.json({ ok: true, leads });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!name || !email) {
    return NextResponse.json(
      { ok: false, error: "name and email are required." },
      { status: 400 }
    );
  }

  const str = (k: string) =>
    typeof body[k] === "string" ? (body[k] as string).trim() || null : null;

  const lead = await prisma.studioLead.create({
    data: {
      name,
      email,
      phone: str("phone"),
      company: str("company"),
      inquirySource: str("inquirySource"),
      serviceType: str("serviceType"),
      budgetRange: str("budgetRange"),
      timeline: str("timeline"),
      message: str("message"),
      notes: str("notes"),
      status: "NEW",
    },
  });

  return NextResponse.json({ ok: true, lead });
}

