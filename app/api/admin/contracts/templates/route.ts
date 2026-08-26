import { DocumentTemplateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.nativeEnum(DocumentTemplateType).optional(),
  description: z.string().max(5000).optional().nullable(),
  contentHtml: z.string().min(1),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  createdByLabel: z.string().max(200).optional().nullable(),
  genAiEnabled: z.boolean().optional(),
  genAiSystemPrompt: z.string().max(50000).optional().nullable(),
  genAiUserPrompt: z.string().max(50000).optional().nullable(),
  genAiModel: z.string().max(200).optional().nullable(),
});

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "1";
  const rows = await prisma.documentTemplate.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ ok: true, templates: rows });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.documentTemplate.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.type ?? DocumentTemplateType.OTHER,
      description: parsed.data.description ?? undefined,
      contentHtml: parsed.data.contentHtml,
      variables: parsed.data.variables ?? [],
      isActive: parsed.data.isActive ?? true,
      createdByLabel: parsed.data.createdByLabel ?? undefined,
      genAiEnabled: parsed.data.genAiEnabled ?? false,
      genAiSystemPrompt: parsed.data.genAiSystemPrompt ?? undefined,
      genAiUserPrompt: parsed.data.genAiUserPrompt ?? undefined,
      genAiModel: parsed.data.genAiModel ?? undefined,
    },
  });
  await logDocumentAudit({
    actorType: "admin",
    action: "document.template_created",
    metadata: { templateId: row.id },
    req,
  });
  return NextResponse.json({ ok: true, template: row });
}
