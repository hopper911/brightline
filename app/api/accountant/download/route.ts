import { NextResponse } from "next/server";
import { assertPermission, auditAccountantAction, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { isAccountingPrivateKey } from "@/lib/accountant/r2-keys";
import { signGet } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canDownloadDocuments");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  const url = new URL(req.url);
  const keyRaw = url.searchParams.get("key");
  if (!keyRaw) {
    return NextResponse.json({ ok: false, error: "key required." }, { status: 400 });
  }
  const key = keyRaw.replace(/^\//, "");
  if (!isAccountingPrivateKey(key)) {
    return NextResponse.json({ ok: false, error: "Invalid key." }, { status: 400 });
  }

  await auditAccountantAction({
    ctx,
    action: "accountant.download",
    metadata: { key },
    req,
  });

  try {
    const { url: signed } = await signGet({ key, expiresIn: 120 });
    return NextResponse.redirect(signed);
  } catch {
    return NextResponse.json({ ok: false, error: "Storage not configured." }, { status: 500 });
  }
}
