import { NextResponse } from "next/server";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import {
  enrichStudioProjectWithGalleryMedia,
  getStudioProjectRecordBySlug,
} from "@/lib/studio/studio-project-cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authenticated read by slug (automation / admin). Same shape as GET /api/projects/[id]. */
export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const auth = await requireProjectsApiAuth(_req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { slug } = await context.params;
  try {
    const row = await getStudioProjectRecordBySlug(slug);
    if (!row) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }
    const project = await enrichStudioProjectWithGalleryMedia(row);
    return NextResponse.json({ ok: true, project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load project.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
