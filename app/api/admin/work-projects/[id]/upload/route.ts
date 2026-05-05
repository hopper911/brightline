import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  resolveWorkProjectUploadTarget,
  type WorkProjectUploadSubfolder,
} from "@/lib/admin/work-project-upload";
import { putObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Same-origin upload path — avoids browser PUT → R2 “Failed to fetch” when bucket CORS blocks the site origin. */
const MAX_BYTES = 250 * 1024 * 1024;

function parseSubfolder(raw: unknown): WorkProjectUploadSubfolder | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const s = raw.trim() as WorkProjectUploadSubfolder;
  if (
    s === "full" ||
    s === "thumb" ||
    s === "video" ||
    s === "background" ||
    s === "poster"
  ) {
    return s;
  }
  return undefined;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const { id: projectId } = await context.params;

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Expected multipart form data." },
        { status: 400 }
      );
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File is too large." }, { status: 400 });
    }

    const subfolder = parseSubfolder(form.get("subfolder"));

    const resolved = await resolveWorkProjectUploadTarget({
      projectId,
      filename: file.name,
      contentType: file.type || undefined,
      subfolder,
    });

    if (!resolved.ok) {
      const status = resolved.error === "Project not found." ? 404 : 400;
      return NextResponse.json({ ok: false, error: resolved.error }, { status });
    }

    const contentType = resolved.contentType;

    if (resolved.subfolder === "poster" && !contentType.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Poster must be an image file." },
        { status: 400 }
      );
    }

    if (
      resolved.subfolder !== "poster" &&
      !contentType.startsWith("image/") &&
      !contentType.startsWith("video/")
    ) {
      return NextResponse.json(
        { ok: false, error: "Only image and video uploads are supported." },
        { status: 400 }
      );
    }

    const body = Buffer.from(await file.arrayBuffer());

    await putObjectBuffer({
      key: resolved.key,
      body,
      contentType,
      access: "private",
    });

    return NextResponse.json({ ok: true, key: resolved.key });
  } catch (err: unknown) {
    console.error("WORK_PROJECT_UPLOAD_ERROR", err);
    const message =
      err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
