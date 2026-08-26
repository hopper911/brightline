import { GeneratedDocumentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { loadGeneratedDocumentForToken } from "@/lib/contracts/client-access";
import { assertDocumentTransition, statusAllowsClientView } from "@/lib/contracts/status";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Idempotent: marks document viewed when status is SENT. Token in URL is the client credential. */
export async function POST(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const doc = await loadGeneratedDocumentForToken(token);
  if (!doc) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) {
    await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: { status: GeneratedDocumentStatus.EXPIRED },
    });
    return NextResponse.json({ ok: false, error: "Expired." }, { status: 410 });
  }

  if (!statusAllowsClientView(doc.status)) {
    return NextResponse.json({ ok: false, error: "Document not available." }, { status: 403 });
  }

  if (doc.status === GeneratedDocumentStatus.SENT) {
    try {
      assertDocumentTransition(doc.status, GeneratedDocumentStatus.VIEWED);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid state." }, { status: 400 });
    }
    await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: { status: GeneratedDocumentStatus.VIEWED, viewedAt: new Date() },
    });
    await logDocumentAudit({
      documentId: doc.id,
      actorType: "client",
      action: "document.viewed",
      req: _req,
    });
  }

  return NextResponse.json({ ok: true });
}
