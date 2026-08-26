import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import {
  deleteHubProject,
  getHubProject,
  isStudioHubConfigured,
  updateHubProject,
} from "@/lib/dual-brand/studio-hub";
import { sanitizeHubProjectPayload } from "@/lib/dual-brand/studio-hub-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isStudioHubConfigured()) {
    return NextResponse.json({ ok: false, error: "Studio hub not configured." }, { status: 503 });
  }
  const { id } = await ctx.params;
  try {
    const project = await getHubProject(id);
    if (!project) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    console.error("STUDIO_HUB_GET_ERROR", e);
    return NextResponse.json({ ok: false, error: "Load failed" }, { status: 502 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;
  if (!isStudioHubConfigured()) {
    return NextResponse.json({ ok: false, error: "Studio hub not configured." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  try {
    const project = await updateHubProject(id, sanitizeHubProjectPayload(body));
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    console.error("STUDIO_HUB_PATCH_ERROR", e);
    return NextResponse.json({ ok: false, error: "Save failed" }, { status: 502 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;
  if (!isStudioHubConfigured()) {
    return NextResponse.json({ ok: false, error: "Studio hub not configured." }, { status: 503 });
  }

  const { id } = await ctx.params;
  try {
    const deleted = await deleteHubProject(id);
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    console.error("STUDIO_HUB_DELETE_ERROR", e);
    const message = e instanceof Error ? e.message : "Delete failed";
    const status = /not found/i.test(message) ? 404 : 502;
    return NextResponse.json({ ok: false, error: status === 404 ? "Not found" : "Delete failed" }, { status });
  }
}
