import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { resolveWorkProjectUploadTarget } from "@/lib/admin/work-project-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    let body: {
      filename?: string;
      contentType?: string;
      subfolder?: "full" | "thumb" | "video" | "background" | "poster";
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
    if (!body.filename?.trim()) {
      return NextResponse.json({ ok: false, error: "filename is required." }, { status: 400 });
    }

    const resolved = await resolveWorkProjectUploadTarget({
      projectId,
      filename: body.filename,
      contentType: body.contentType,
      subfolder: body.subfolder,
    });

    if (!resolved.ok) {
      const status = resolved.error === "Project not found." ? 404 : 400;
      return NextResponse.json({ ok: false, error: resolved.error }, { status });
    }

    const { getMarketingUploadUrl } = await import("@/lib/image-strategy");
    const signed = await getMarketingUploadUrl({
      key: resolved.key,
      contentType: resolved.contentType,
    });

    return NextResponse.json({ ok: true, url: signed.url, headers: signed.headers, key: resolved.key });
  } catch (err: unknown) {
    console.error("WORK_PROJECT_UPLOAD_URL_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to get upload URL.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
