import { GeneratedDocumentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { logDocumentAudit } from "@/lib/contracts/audit";
import { loadGeneratedDocumentForToken } from "@/lib/contracts/client-access";
import { buildContractPdfBuffer } from "@/lib/contracts/pdf";
import { contractPdfKey } from "@/lib/contracts/r2-keys";
import { statusAllowsClientSign } from "@/lib/contracts/status";
import { signDocumentBodySchema } from "@/lib/forms/validate";
import { prisma } from "@/lib/prisma";
import { putObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const doc = await loadGeneratedDocumentForToken(token);
  if (!doc) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "Expired." }, { status: 410 });
  }

  if (!statusAllowsClientSign(doc.status)) {
    return NextResponse.json({ ok: false, error: "Signing not allowed for this document." }, { status: 403 });
  }

  if (doc.signature) {
    return NextResponse.json({ ok: false, error: "Already signed." }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = signDocumentBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent");
  const signedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.documentSignature.create({
      data: {
        documentId: doc.id,
        signerName: parsed.data.signerName,
        signerEmail: parsed.data.signerEmail,
        consentAccepted: parsed.data.consentAccepted,
        signedAt,
        ipAddress: ip,
        userAgent: ua ?? undefined,
        documentVersion: doc.templateVersion,
      },
    });
    await tx.generatedDocument.update({
      where: { id: doc.id },
      data: {
        status: GeneratedDocumentStatus.SIGNED,
        signedAt,
      },
    });
  });

  const withClient = await prisma.generatedDocument.findUnique({
    where: { id: doc.id },
    include: { studioClient: true, studioProject: true, signature: true },
  });
  if (!withClient?.signature) {
    return NextResponse.json({ ok: false, error: "Signature persist failed." }, { status: 500 });
  }

  const key = contractPdfKey({
    year: signedAt.getFullYear(),
    clientSlug: withClient.studioClient.companyName,
    projectSlug: withClient.studioProject?.slug ?? "no-project",
    kind: "signed",
    documentId: withClient.id,
  });

  const buf = await buildContractPdfBuffer({
    title: withClient.title,
    contentHtml: withClient.contentHtml,
    documentId: withClient.id,
    signerName: withClient.signature.signerName,
    signerEmail: withClient.signature.signerEmail,
    signedAt: withClient.signature.signedAt,
  });
  await putObjectBuffer({ key, body: buf, contentType: "application/pdf", access: "private" });
  await prisma.generatedDocument.update({
    where: { id: withClient.id },
    data: { signedPdfKey: key },
  });

  await logDocumentAudit({
    documentId: doc.id,
    actorType: "client",
    action: "document.signed",
    metadata: { signerEmail: parsed.data.signerEmail },
    req,
  });

  return NextResponse.json({ ok: true, signedPdfKey: key });
}
