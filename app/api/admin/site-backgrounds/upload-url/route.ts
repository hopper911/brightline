import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { SITE_BACKGROUNDS_PREFIX } from "@/lib/site-background-videos";
import { signPut } from "@/lib/storage-r2";
import { isAllowedImageOrVideoUpload } from "@/lib/upload-mime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileName(name: string): string {
  return name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 160);
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { fileName?: string; contentType?: string; folder?: "full" | "web" | "posters" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const fileName = safeFileName(body.fileName ?? "");
  if (!fileName) {
    return NextResponse.json({ ok: false, error: "fileName is required." }, { status: 400 });
  }

  const folder =
    body.folder === "web" ? "web" : body.folder === "posters" ? "posters" : "full";
  const key = `${SITE_BACKGROUNDS_PREFIX}${folder}/${Date.now()}-${fileName}`;
  const contentType = isAllowedImageOrVideoUpload(body.contentType);
  if (!contentType) {
    return NextResponse.json(
      { ok: false, error: "Only allowed image/video types are supported (not SVG/HTML)." },
      { status: 400 }
    );
  }

  try {
    const signed = await signPut({
      key,
      contentType,
      // Avoid x-amz-acl on browser PUTs (CORS preflight). site/ is served via /api/media/public.
      access: "private",
    });
    return NextResponse.json({
      ok: true,
      key,
      uploadUrl: signed.url,
      headers: signed.headers,
      expiresIn: signed.expiresIn,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload URL failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
