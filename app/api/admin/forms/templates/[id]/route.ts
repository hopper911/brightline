import { FormTemplateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  type: z.nativeEnum(FormTemplateType).optional(),
  description: z.string().max(5000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const row = await prisma.formTemplate.findUnique({
    where: { id },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  if (!row) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, template: row });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.type !== undefined) data.type = parsed.data.type;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  const row = await prisma.formTemplate.update({ where: { id }, data });
  return NextResponse.json({ ok: true, template: row });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    await prisma.formTemplate.delete({ where: { id } });
  } catch {
    return NextResponse.json({ ok: false, error: "Cannot delete (submissions may exist)." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
