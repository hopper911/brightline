import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { SITE_BACKGROUNDS_PREFIX } from "@/lib/site-background-videos";
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

function stagingId(): string {
  return `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Start a staged upload. Chunks land under `.upload-parts/{id}/` (≤3MB each for Vercel),
 * then complete assembles them into an R2 multipart object with ≥5MB parts (S3/R2 rule).
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    fileName?: string;
    contentType?: string;
    folder?: "full" | "web" | "posters" | "social";
    bytes?: number;
  };
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
    body.folder === "web"
      ? "web"
      : body.folder === "posters"
        ? "posters"
        : body.folder === "social"
          ? "social"
          : "full";
  const contentType = isAllowedImageOrVideoUpload(body.contentType);
  if (!contentType) {
    return NextResponse.json({ ok: false, error: "Unsupported content type." }, { status: 400 });
  }
  const key = `${SITE_BACKGROUNDS_PREFIX}${folder}/${Date.now()}-${fileName}`;
  const id = stagingId();
  const stagingPrefix = `${SITE_BACKGROUNDS_PREFIX}.upload-parts/${id}/`;

  return NextResponse.json({
    ok: true,
    key,
    stagingId: id,
    stagingPrefix,
    contentType,
    /** Stay under Vercel’s ~4.5MB function body limit. */
    partSize: 3 * 1024 * 1024,
    /** R2/S3 non-final multipart parts must be ≥5MiB — enforced on complete. */
    minMultipartPartSize: 5 * 1024 * 1024,
    bytes: typeof body.bytes === "number" ? body.bytes : null,
  });
}
