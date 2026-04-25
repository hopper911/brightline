import { NextResponse } from "next/server";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import { publishStudioProjectRecord } from "@/lib/studio/studio-project-cms";
import { studioProjectAdminEditUrl, studioProjectLiveUrl } from "@/lib/studio/studio-project-urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Set published state for a StudioProject (`StudioProject` table).
 * Body: `{ "id": "<uuid>" } | { "slug": "<slug>" }`, optional `"published": boolean`
 * - `published` defaults to `true` (publish now).
 * - `published: false` unpublishes and clears `publishedAt`.
 */
export async function POST(req: Request) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const project = await publishStudioProjectRecord(body);
    const liveUrl = project.published ? studioProjectLiveUrl(project.slug) : null;
    return NextResponse.json({
      ok: true,
      project,
      liveUrl,
      draftUrl: studioProjectAdminEditUrl(project.id),
      publishedAt: project.publishedAt?.toISOString() ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to publish.";
    const status =
      msg.includes("not found") ? 404 : msg.includes("required") || msg.includes("must be") ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
