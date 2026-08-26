import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getOcrProvider } from "@/lib/integrations/ocrProvider";
import { getStorageProvider } from "@/lib/integrations/storageProvider";
import { normalizeUploadContentType } from "@/lib/upload-mime";

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

function guessReceiptContentType(filename: string, raw?: string): string | null {
  const normalized = normalizeUploadContentType(raw);
  if (normalized) return normalized;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return normalizeUploadContentType("application/pdf");
  if (/\.jpe?g$/.test(lower)) return normalizeUploadContentType("image/jpeg");
  if (lower.endsWith(".png")) return normalizeUploadContentType("image/png");
  if (lower.endsWith(".webp")) return normalizeUploadContentType("image/webp");
  if (lower.endsWith(".heic")) return normalizeUploadContentType("image/heic");
  return normalizeUploadContentType("application/pdf");
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

  const contentType = guessReceiptContentType(body.filename, body.contentType);
  if (!contentType) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported content type. Receipt uploads allow images or PDF only (not HTML/SVG).",
      },
      { status: 400 }
    );
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
      contentType,
    });
    const ocrProvider = getOcrProvider();
    return NextResponse.json({
      ok: true,
      key,
      receiptPath: key,
      uploadUrl: signed.url,
      uploadHeaders: {},
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
