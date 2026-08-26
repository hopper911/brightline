import { GeneratedDocumentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { createGeneratedDocument } from "@/lib/contracts/service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  templateId: z.string().min(1),
  studioClientId: z.string().min(1),
  studioProjectId: z.string().optional().nullable(),
  studioInvoiceId: z.string().optional().nullable(),
  title: z.string().max(500).optional().nullable(),
  galleryLink: z.string().max(2000).optional().nullable(),
  variableOverrides: z.record(z.unknown()).optional().nullable(),
  asDraft: z.boolean().optional(),
});

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
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { studioClientId, studioProjectId, studioInvoiceId } = parsed.data;
  if (studioProjectId) {
    const p = await prisma.studioProject.findUnique({ where: { id: studioProjectId } });
    if (!p) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    if (p.clientId && p.clientId !== studioClientId) {
      return NextResponse.json({ ok: false, error: "Project does not belong to this client." }, { status: 400 });
    }
  }
  if (studioInvoiceId) {
    const inv = await prisma.studioInvoice.findUnique({ where: { id: studioInvoiceId } });
    if (!inv) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
    if (inv.clientId !== studioClientId) {
      return NextResponse.json({ ok: false, error: "Invoice does not belong to this client." }, { status: 400 });
    }
  }

  try {
    const { document } = await createGeneratedDocument({
      templateId: parsed.data.templateId,
      studioClientId,
      studioProjectId: studioProjectId ?? null,
      studioInvoiceId: studioInvoiceId ?? null,
      title: parsed.data.title ?? null,
      galleryLink: parsed.data.galleryLink ?? null,
      variableOverrides: (parsed.data.variableOverrides as Record<string, unknown> | null) ?? null,
      initialStatus: parsed.data.asDraft ? GeneratedDocumentStatus.DRAFT : GeneratedDocumentStatus.GENERATED,
    });
    await logDocumentAudit({
      documentId: document.id,
      actorType: "admin",
      action: "document.generated",
      metadata: { templateId: document.templateId, status: document.status },
      req,
    });
    return NextResponse.json({ ok: true, document });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    const status = typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ ok: false, error: err.message ?? "Generate failed." }, { status });
  }
}
