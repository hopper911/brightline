import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import {
  assertR2ManagerKeyAllowed,
  cleanR2Key,
  normalizePrefix,
} from "@/lib/admin-r2-manager";
import { isPrivateMediaKey } from "@/lib/media-key-access";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { signPut } from "@/lib/storage-r2";
import { normalizeUploadContentType } from "@/lib/upload-mime";
import { normalizeR2VaultId } from "@/lib/r2-vaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileName(name: string): string {
  return name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 180);
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "r2-upload-url", max: 120, windowMs: 60 * 60_000 })) {
    return NextResponse.json({ ok: false, error: "Too many upload requests." }, { status: 429 });
  }

  let body: { prefix?: string; fileName?: string; contentType?: string; vault?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const vault = normalizeR2VaultId(body.vault);
  const prefix = normalizePrefix(body.prefix ?? "");
  const fileName = safeFileName(body.fileName ?? "");
  if (!prefix || !fileName) {
    return NextResponse.json(
      { ok: false, error: "prefix and fileName are required." },
      { status: 400 }
    );
  }

  const contentType = normalizeUploadContentType(body.contentType);
  if (!contentType) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unsupported content type. Upload images, video, audio, PDF, or fonts only (not HTML/SVG).",
      },
      { status: 400 }
    );
  }

  try {
    assertR2ManagerKeyAllowed(prefix, vault);
    const key = cleanR2Key(`${prefix}${fileName}`);
    assertR2ManagerKeyAllowed(key, vault);
    const access =
      vault === "brightline" && isPrivateMediaKey(key) ? "private" : "public-read";
    const signed = await signPut({ key, contentType, access, expiresIn: 900, vault });
    return NextResponse.json({
      ok: true,
      key,
      uploadUrl: signed.url,
      headers: signed.headers,
      expiresIn: signed.expiresIn,
      access,
      vault,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload URL failed.";
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
