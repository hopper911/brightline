import { FormTemplateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.nativeEnum(FormTemplateType).optional(),
  description: z.string().max(5000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const rows = await prisma.formTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { submissions: true, fields: true } } },
  });
  return NextResponse.json({ ok: true, templates: rows });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.formTemplate.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.type ?? FormTemplateType.OTHER,
      description: parsed.data.description ?? undefined,
      isActive: parsed.data.isActive ?? true,
    },
  });
  return NextResponse.json({ ok: true, template: row });
}
