import { NextResponse } from "next/server";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import {
  deleteStudioProjectRecord,
  enrichStudioProjectWithGalleryMedia,
  getStudioProjectRecordById,
  updateStudioProjectRecord,
} from "@/lib/studio/studio-project-cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireProjectsApiAuth(_req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  try {
    const row = await getStudioProjectRecordById(id);
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

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const project = await updateStudioProjectRecord(id, body);
    return NextResponse.json({ ok: true, project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update project.";
    const status = msg.includes("not found")
      ? 404
      : msg.includes("required") || msg.includes("must be") || msg.includes("cannot")
        ? 400
        : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireProjectsApiAuth(_req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  try {
    await deleteStudioProjectRecord(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete project.";
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
