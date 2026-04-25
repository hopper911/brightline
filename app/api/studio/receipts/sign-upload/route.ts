import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getOcrProvider } from "@/lib/integrations/ocrProvider";
import { getStorageProvider } from "@/lib/integrations/storageProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(input: string): string {
  return input
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120) || "receipt";
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { filename?: string; contentType?: string; expenseId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.filename) {
    return NextResponse.json({ ok: false, error: "filename is required." }, { status: 400 });
  }

  const now = new Date();
  const key = [
    "studio-os",
    "receipts",
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
    `${Date.now()}-${safeFilename(body.filename)}`,
  ].join("/");

  try {
    const storage = getStorageProvider();
    const signed = await storage.signUpload({
      key,
      contentType: body.contentType ?? "application/octet-stream",
    });
    const ocrProvider = getOcrProvider();
    return NextResponse.json({
      ok: true,
      key,
      receiptPath: key,
      uploadUrl: signed.url,
      uploadHeaders: signed.headers,
      expiresIn: signed.expiresIn,
      storageProvider: storage.name,
      ocrProvider: ocrProvider.name,
      ocrMode: ocrProvider.name === "manual" ? "manual" : "configured",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to sign receipt upload.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
