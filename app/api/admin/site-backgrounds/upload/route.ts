import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { SITE_BACKGROUNDS_PREFIX } from "@/lib/site-background-videos";
import { putObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** High-res masters can be large; prefer signed URL for bigger files on the client. */
const MAX_BYTES = 95 * 1024 * 1024;

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
    return NextResponse.json(
      {
        ok: false,
        error: "File is too large for server upload. Use a smaller encode or Choose from R2.",
        code: "too_large",
      },
      { status: 413 }
    );
  }

  const contentType = file.type || "application/octet-stream";
  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    return NextResponse.json(
      { ok: false, error: "Only image and video uploads are supported." },
      { status: 400 }
    );
  }

  const folderRaw = form.get("folder")?.toString().trim() || "full";
  const folder =
    folderRaw === "web" ? "web" : folderRaw === "posters" ? "posters" : "full";
  const key = `${SITE_BACKGROUNDS_PREFIX}${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const body = Buffer.from(await file.arrayBuffer());

  try {
    await putObjectBuffer({
      key,
      body,
      contentType,
      access: "private",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    key,
    bytes: body.length,
    mimeType: contentType,
  });
}
