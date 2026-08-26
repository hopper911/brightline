import { GeneratedDocumentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { loadGeneratedDocumentForToken } from "@/lib/contracts/client-access";
import { bufferToWebBody } from "@/lib/http/pdf-response";
import { getObjectBuffer, signGet } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") === "1";

  const doc = await loadGeneratedDocumentForToken(token);
  if (!doc) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  if (doc.status !== GeneratedDocumentStatus.SIGNED) {
    return NextResponse.json({ ok: false, error: "PDF available after signing." }, { status: 403 });
  }

  const key = doc.signedPdfKey;
  if (!key) {
    return NextResponse.json({ ok: false, error: "PDF not ready." }, { status: 404 });
  }

  if (redirect) {
    const { url: signed } = await signGet({ key, expiresIn: 600 });
    return NextResponse.redirect(signed);
  }
  const buf = await getObjectBuffer(key);
  return new NextResponse(bufferToWebBody(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="brightline-signed-${doc.id.slice(0, 8)}.pdf"`,
    },
  });
}
