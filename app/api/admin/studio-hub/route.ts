import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import {
  createHubProject,
  isStudioHubConfigured,
  listHubProjects,
} from "@/lib/dual-brand/studio-hub";
import { sanitizeHubProjectPayload } from "@/lib/dual-brand/studio-hub-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isStudioHubConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Studio hub not configured (missing Mirotech sync secret)." },
      { status: 503 }
    );
  }
  try {
    const projects = await listHubProjects();
    return NextResponse.json({ ok: true, projects });
  } catch (e) {
    console.error("STUDIO_HUB_LIST_ERROR", e);
    return NextResponse.json(
      { ok: false, error: "Failed to list hub projects" },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;

  if (!isStudioHubConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Studio hub not configured (missing Mirotech sync secret)." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  try {
    const project = await createHubProject(sanitizeHubProjectPayload(body));
    return NextResponse.json({ ok: true, project }, { status: 201 });
  } catch (e) {
    console.error("STUDIO_HUB_CREATE_ERROR", e);
    return NextResponse.json({ ok: false, error: "Create failed" }, { status: 502 });
  }
}
