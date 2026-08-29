import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  allowedProjectTenants,
  canReadBrightlineStudioProjects,
  canReadMirotechStudioProjects,
  canWriteStudioProject,
} from "@/lib/studio/access";
import { getStudioProjectEditorView } from "@/lib/studio/projects/get-studio-project-editor";
import { parseStudioProjectRefParam } from "@/lib/studio/projects/project-ref";
import { saveStudioProjectSection } from "@/lib/studio/projects/save-studio-project-section";
import type { StudioProjectEditorSection } from "@/lib/studio/projects/validate-studio-project-section";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTIONS: StudioProjectEditorSection[] = [
  "overview",
  "content",
  "details",
  "seo",
  "publishing",
];

function canReadProject(
  tenant: "brightline" | "mirotech",
  permissions: string[],
  legacyAdmin: boolean
): boolean {
  if (tenant === "brightline") return canReadBrightlineStudioProjects(permissions as never, legacyAdmin);
  return canReadMirotechStudioProjects(permissions as never, legacyAdmin);
}

export async function GET(
  req: Request,
  context: { params: Promise<{ projectRef: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const opsContext = await resolveStudioOpsContext(req);
  if (!opsContext) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { projectRef } = await context.params;
  const ref = parseStudioProjectRefParam(projectRef);
  if (!ref) {
    return NextResponse.json({ ok: false, error: "Invalid project reference." }, { status: 400 });
  }

  const legacyAdmin = opsContext.subjectKind === "legacy_admin";
  if (!allowedProjectTenants(opsContext.permissions, legacyAdmin, opsContext.memberships).includes(ref.tenant)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  if (!canReadProject(ref.tenant, opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const view = await getStudioProjectEditorView(ref);
  if (!view) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    view,
    canWrite: canWriteStudioProject(ref.tenant, opsContext.permissions, legacyAdmin),
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ projectRef: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const opsContext = await resolveStudioOpsContext(req);
  if (!opsContext) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { projectRef } = await context.params;
  const ref = parseStudioProjectRefParam(projectRef);
  if (!ref) {
    return NextResponse.json({ ok: false, error: "Invalid project reference." }, { status: 400 });
  }

  const legacyAdmin = opsContext.subjectKind === "legacy_admin";
  if (!canWriteStudioProject(ref.tenant, opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    section?: string;
    data?: Record<string, unknown>;
  } | null;

  const section = body?.section;
  if (!section || !SECTIONS.includes(section as StudioProjectEditorSection)) {
    return NextResponse.json({ ok: false, error: "Valid section is required." }, { status: 400 });
  }

  const view = await getStudioProjectEditorView(ref);
  if (!view) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  const data = {
    ...(body?.data ?? {}),
    completenessComplete: view.completeness.complete,
  };

  try {
    const result = await saveStudioProjectSection(ref, section as StudioProjectEditorSection, data);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    const refreshed = await getStudioProjectEditorView(ref);
    return NextResponse.json({ ok: true, jobId: result.jobId, view: refreshed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
