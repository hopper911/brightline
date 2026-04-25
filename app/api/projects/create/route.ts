import { NextResponse } from "next/server";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import { createStudioProjectRecord } from "@/lib/studio/studio-project-cms";
import { studioProjectAdminEditUrl } from "@/lib/studio/studio-project-urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const project = await createStudioProjectRecord(body);
    const draftUrl = studioProjectAdminEditUrl(project.id);
    return NextResponse.json({
      ok: true,
      project,
      /** Same as `project.id` — stable ID for Airtable “Website Project ID”. */
      websiteProjectId: project.id,
      draftUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create project.";
    const status =
      msg.includes("already exists") || msg.includes("slug")
        ? 409
        : msg.includes("required") ||
            msg.includes("must be") ||
            msg.includes("cannot") ||
            msg.includes("does not reference")
          ? 400
          : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
