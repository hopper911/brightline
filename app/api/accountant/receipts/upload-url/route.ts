import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPermission, auditAccountantAction, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { buildReceiptUploadKey } from "@/lib/accountant/r2-keys";
import { signPut } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 15 * 1024 * 1024;

const Body = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_BYTES),
});

export async function POST(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canUploadReceipts");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const ct = parsed.data.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED.has(ct)) {
    return NextResponse.json({ ok: false, error: "Unsupported file type." }, { status: 400 });
  }

  const { key } = buildReceiptUploadKey(parsed.data.fileName);
  try {
    const signed = await signPut({ key, contentType: ct, expiresIn: 900 });
    await auditAccountantAction({
      ctx,
      action: "accountant.receipt.upload_url",
      metadata: { key, contentType: ct },
      req,
    });
    return NextResponse.json({
      ok: true,
      url: signed.url,
      key,
      expiresIn: signed.expiresIn,
      headers: signed.headers,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Storage not configured." }, { status: 500 });
  }
}
