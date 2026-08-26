import { DocumentTemplateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  type: z.nativeEnum(DocumentTemplateType).optional(),
  description: z.string().max(5000).nullable().optional(),
  contentHtml: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  bumpVersion: z.boolean().optional(),
  genAiEnabled: z.boolean().optional(),
  genAiSystemPrompt: z.string().max(50000).nullable().optional(),
  genAiUserPrompt: z.string().max(50000).nullable().optional(),
  genAiModel: z.string().max(200).nullable().optional(),
});

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const row = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, template: row });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const existing = await prisma.documentTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  const bump = parsed.data.bumpVersion ?? false;
  const nextVersion = bump ? existing.version + 1 : existing.version;

  const row = await prisma.documentTemplate.update({
    where: { id },
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      description: parsed.data.description === null ? null : parsed.data.description,
      contentHtml: parsed.data.contentHtml,
      variables: parsed.data.variables,
      isActive: parsed.data.isActive,
      version: nextVersion,
      genAiEnabled: parsed.data.genAiEnabled,
      genAiSystemPrompt: parsed.data.genAiSystemPrompt,
      genAiUserPrompt: parsed.data.genAiUserPrompt,
      genAiModel: parsed.data.genAiModel,
    },
  });
  await logDocumentAudit({
    actorType: "admin",
    action: "document.template_updated",
    metadata: { templateId: row.id, version: row.version },
    req,
  });
  return NextResponse.json({ ok: true, template: row });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    await prisma.documentTemplate.delete({ where: { id } });
  } catch {
    return NextResponse.json({ ok: false, error: "Cannot delete (may be in use)." }, { status: 400 });
  }
  await logDocumentAudit({
    actorType: "admin",
    action: "document.template_deleted",
    metadata: { templateId: id },
    req,
  });
  return NextResponse.json({ ok: true });
}
