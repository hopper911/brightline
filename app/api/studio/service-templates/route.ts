import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { asNullableString, parseMoney } from "@/lib/studio/finance";
import type { ServiceTemplateType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeType(value: unknown): ServiceTemplateType {
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (upper === "PER_IMAGE" || upper === "FLAT" || upper === "HOURLY" || upper === "CANCELLATION") {
    return upper as ServiceTemplateType;
  }
  return "FLAT";
}

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") !== "0";

  const templates = await prisma.studioServiceTemplate.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 200,
  });

  return NextResponse.json({ ok: true, templates });
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

  const slug = asNullableString(body.slug);
  const name = asNullableString(body.name);
  if (!slug || !name) {
    return NextResponse.json({ ok: false, error: "slug and name are required." }, { status: 400 });
  }

  const type = normalizeType(body.type);
  const unitLabel = asNullableString(body.unitLabel) || "unit";
  const defaultPrice = parseMoney(body.defaultPrice, "defaultPrice");
  const maxPriceRaw = body.maxPrice;
  const maxPrice =
    maxPriceRaw === null || maxPriceRaw === undefined || maxPriceRaw === ""
      ? null
      : parseMoney(maxPriceRaw, "maxPrice");
  const sortOrder =
    typeof body.sortOrder === "number"
      ? body.sortOrder
      : typeof body.sortOrder === "string"
        ? Number.parseInt(body.sortOrder, 10)
        : 0;

  try {
    const template = await prisma.studioServiceTemplate.create({
      data: {
        slug,
        name,
        type,
        unitLabel,
        defaultPrice,
        maxPrice,
        sortOrder,
        isActive: body.isActive !== false,
      },
    });
    return NextResponse.json({ ok: true, template });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
