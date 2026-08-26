import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getStorageProvider } from "@/lib/integrations/storageProvider";
import { isStudioReceiptKey } from "@/lib/media-key-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { key?: string; expiresIn?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.key) {
    return NextResponse.json({ ok: false, error: "key is required." }, { status: 400 });
  }

  if (!isStudioReceiptKey(body.key)) {
    return NextResponse.json(
      { ok: false, error: "Key not allowed for receipt download." },
      { status: 400 }
    );
  }

  try {
    const storage = getStorageProvider();
    const signed = await storage.signDownload({
      key: body.key.trim().replace(/^\/+/, ""),
      expiresIn: body.expiresIn,
    });
    return NextResponse.json({
      ok: true,
      url: signed.url,
      expiresIn: signed.expiresIn,
      storageProvider: storage.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to sign receipt download.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
