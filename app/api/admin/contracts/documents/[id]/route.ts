import { GeneratedDocumentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { assertDocumentTransition } from "@/lib/contracts/status";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  contentHtml: z.string().min(1).optional(),
  title: z.string().min(1).max(500).optional(),
  status: z.nativeEnum(GeneratedDocumentStatus).optional(),
});

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const row = await prisma.generatedDocument.findUnique({
    where: { id },
    include: {
      template: true,
      studioClient: true,
      studioProject: true,
      studioInvoice: true,
      signature: true,
      auditLogs: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!row) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, document: row });
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

  const existing = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    try {
      assertDocumentTransition(existing.status, parsed.data.status);
    } catch (e) {
      const err = e as { status?: number; message?: string };
      return NextResponse.json({ ok: false, error: err.message ?? "Bad transition." }, { status: err.status ?? 400 });
    }
  }

  const data: { contentHtml?: string; title?: string; status?: GeneratedDocumentStatus } = {};
  if (parsed.data.contentHtml !== undefined) data.contentHtml = parsed.data.contentHtml;
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;

  const row = await prisma.generatedDocument.update({
    where: { id },
    data,
  });
  await logDocumentAudit({
    documentId: id,
    actorType: "admin",
    action: "document.admin_updated",
    metadata: { fields: Object.keys(parsed.data) },
    req,
  });
  return NextResponse.json({ ok: true, document: row });
}
