import { NextResponse } from "next/server";
import { loadGeneratedDocumentForToken } from "@/lib/contracts/client-access";
import { statusAllowsClientView } from "@/lib/contracts/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const doc = await loadGeneratedDocumentForToken(token);
  if (!doc) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  if (!statusAllowsClientView(doc.status)) {
    return NextResponse.json({ ok: false, error: "Not available." }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    title: doc.title,
    contentHtml: doc.contentHtml,
    status: doc.status,
    hasSignature: Boolean(doc.signature),
  });
}
