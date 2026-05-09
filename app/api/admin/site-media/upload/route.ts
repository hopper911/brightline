import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getPublicR2Url } from "@/lib/r2";
import { putObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = new Set(["pages", "services", "blocks", "theme", "projects"]);
const MAX_BYTES = 50 * 1024 * 1024;

function safeFilename(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "media";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 140) || "media";
}

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File is too large." }, { status: 400 });
  }

  const contentType = file.type || "application/octet-stream";
  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    return NextResponse.json({ ok: false, error: "Only image and video uploads are supported." }, { status: 400 });
  }

  const folderRaw = form.get("folder")?.toString().trim() || "blocks";
  const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "blocks";
  const key = `site/${folder}/${Date.now()}-${safeFilename(file.name)}`;
  const body = Buffer.from(await file.arrayBuffer());

  await putObjectBuffer({
    key,
    body,
    contentType,
    access: "public-read",
  });

  return NextResponse.json({
    ok: true,
    key,
    publicUrl: getPublicR2Url(key),
    mimeType: contentType,
    bytes: body.length,
  });
}
