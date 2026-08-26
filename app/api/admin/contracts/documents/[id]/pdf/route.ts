import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { buildContractPdfBuffer } from "@/lib/contracts/pdf";
import { writeDraftPdfForDocument } from "@/lib/contracts/service";
import { prisma } from "@/lib/prisma";
import { bufferToWebBody } from "@/lib/http/pdf-response";
import { getObjectBuffer, signGet } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const url = new URL(req.url);
  const wantRedirect = url.searchParams.get("redirect") === "1";

  try {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id },
      include: { signature: true },
    });
    if (!doc) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

    const preferSigned = url.searchParams.get("kind") !== "draft";
    const key = preferSigned && doc.signedPdfKey ? doc.signedPdfKey : doc.draftPdfKey;

    if (key) {
      if (wantRedirect) {
        const { url: signed } = await signGet({ key, expiresIn: 600 });
        return NextResponse.redirect(signed);
      }
      const buf = await getObjectBuffer(key);
      return new NextResponse(bufferToWebBody(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="brightline-document-${id.slice(0, 8)}.pdf"`,
        },
      });
    }

    const buf = await buildContractPdfBuffer({
      title: doc.title,
      contentHtml: doc.contentHtml,
      documentId: doc.id,
      signerName: doc.signature?.signerName,
      signerEmail: doc.signature?.signerEmail,
      signedAt: doc.signature?.signedAt,
    });

    try {
      await writeDraftPdfForDocument(doc.id, buf);
    } catch (r2Err) {
      console.error("CONTRACT_DRAFT_PDF_R2_UPLOAD", r2Err);
    }

    return new NextResponse(bufferToWebBody(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="brightline-document-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (e) {
    console.error("CONTRACT_ADMIN_PDF", e);
    return NextResponse.json(
      { ok: false, error: "PDF could not be generated. If this persists, check server logs." },
      { status: 500 }
    );
  }
}
