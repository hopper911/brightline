import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseActive(param: string | null): boolean | undefined {
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
  const active = parseActive(searchParams.get("active"));

  const where: Prisma.StudioClientWhereInput = {};

  if (active !== undefined) {
    where.isActive = active;
  }

  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { primaryContactName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.studioClient.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { projects: true } },
    },
  });

  return NextResponse.json({ ok: true, clients });
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

  const companyName =
    typeof body.companyName === "string" ? body.companyName.trim() : "";
  if (!companyName) {
    return NextResponse.json(
      { ok: false, error: "companyName is required." },
      { status: 400 }
    );
  }

  const str = (k: string) =>
    typeof body[k] === "string" ? (body[k] as string).trim() || null : null;

  const client = await prisma.studioClient.create({
    data: {
      companyName,
      primaryContactName: str("primaryContactName"),
      email: str("email"),
      phone: str("phone"),
      website: str("website"),
      industry: str("industry"),
      addressLine1: str("addressLine1"),
      addressLine2: str("addressLine2"),
      city: str("city"),
      state: str("state"),
      postalCode: str("postalCode"),
      country: str("country"),
      notes: str("notes"),
      followUpStatus:
        body.followUpStatus === "NEEDED" ||
        body.followUpStatus === "SCHEDULED" ||
        body.followUpStatus === "DONE"
          ? body.followUpStatus
          : "NONE",
      followUpAt:
        typeof body.followUpAt === "string" && body.followUpAt.trim()
          ? new Date(body.followUpAt)
          : null,
      isActive: body.isActive === false ? false : true,
    },
  });

  return NextResponse.json({ ok: true, client });
}
