import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getPublicR2Url } from "@/lib/r2";
import { signPut } from "@/lib/storage-r2";
import { isAllowedImageOrVideoUpload } from "@/lib/upload-mime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = new Set(["pages", "services", "blocks", "theme", "projects"]);

function safeFilename(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "media";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 140) || "media";
}

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { filename?: string; contentType?: string; folder?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const filename = safeFilename(body.filename ?? "");
  const contentType = isAllowedImageOrVideoUpload(body.contentType);
  const folder = body.folder?.trim() && ALLOWED_FOLDERS.has(body.folder.trim())
    ? body.folder.trim()
    : "blocks";

  if (!filename) {
    return NextResponse.json({ ok: false, error: "filename is required." }, { status: 400 });
  }
  if (!contentType) {
    return NextResponse.json(
      { ok: false, error: "Only allowed image/video types are supported (not SVG/HTML)." },
      { status: 400 }
    );
  }

  const key = `site/${folder}/${Date.now()}-${filename}`;
  const signed = await signPut({ key, contentType, access: "public-read" });
  return NextResponse.json({
    ok: true,
    url: signed.url,
    headers: signed.headers,
    key,
    publicUrl: getPublicR2Url(key),
  });
}
