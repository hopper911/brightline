import { GeneratedDocumentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { generateClientToken } from "@/lib/contracts/r2-keys";
import { assertDocumentTransition } from "@/lib/contracts/status";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const doc = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  try {
    assertDocumentTransition(doc.status, GeneratedDocumentStatus.SENT);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return NextResponse.json({ ok: false, error: err.message ?? "Cannot send from this status." }, { status: err.status ?? 400 });
  }

  const clientToken = doc.clientToken?.trim() ? doc.clientToken : generateClientToken();
  const now = new Date();
  const row = await prisma.generatedDocument.update({
    where: { id },
    data: {
      status: GeneratedDocumentStatus.SENT,
      sentAt: now,
      clientToken,
    },
  });
  await logDocumentAudit({
    documentId: id,
    actorType: "admin",
    action: "document.sent",
    metadata: { sentAt: now.toISOString() },
    req,
  });
  return NextResponse.json({ ok: true, document: row });
}
