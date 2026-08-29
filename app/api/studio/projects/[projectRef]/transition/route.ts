import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { ProjectWorkflowTransitionError } from "@/lib/platform/projects/errors";
import { defaultProjectWorkflowService } from "@/lib/platform/projects/server";
import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";
import { PROJECT_WORKFLOW_LIFECYCLE } from "@/lib/platform/projects/types";
import {
  allowedProjectTenants,
  canWriteStudioProject,
} from "@/lib/studio/access";
import { getStudioProjectEditorView } from "@/lib/studio/projects/get-studio-project-editor";
import { parseStudioProjectRefParam } from "@/lib/studio/projects/project-ref";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import type { AuthorizationSubject } from "@/lib/platform/authorization/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function subjectFromOps(
  subjectKind: "legacy_admin" | "platform_user",
  userId: string | null
): AuthorizationSubject {
  if (subjectKind === "platform_user" && userId) {
    return { kind: "user", userId };
  }
  return { kind: "legacy_admin" };
}

export async function POST(
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
  if (!canWriteStudioProject(ref.tenant, opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    toLifecycle?: string;
    reviewNotes?: string;
  } | null;

  const toLifecycle = body?.toLifecycle;
  if (
    !toLifecycle ||
    !(PROJECT_WORKFLOW_LIFECYCLE as readonly string[]).includes(toLifecycle)
  ) {
    return NextResponse.json({ ok: false, error: "Valid toLifecycle is required." }, { status: 400 });
  }

  const platformContext = createPlatformContextForTenant(ref.tenant);
  const subject = subjectFromOps(opsContext.subjectKind, opsContext.userId);

  try {
    const result = await defaultProjectWorkflowService.transitionLifecycle(platformContext, subject, {
      tenant: ref.tenant,
      ref,
      toLifecycle: toLifecycle as ProjectWorkflowLifecycle,
      reviewNotes: body?.reviewNotes,
    });

    const view = await getStudioProjectEditorView(ref, {
      permissions: opsContext.permissions,
      legacyAdmin,
    });

    return NextResponse.json({
      ok: true,
      transition: result,
      view,
      jobId: result.jobId,
      publicPath: result.publicPath,
      publishPending: result.publishPending,
    });
  } catch (error) {
    if (error instanceof ProjectWorkflowTransitionError) {
      return NextResponse.json({
        ok: false,
        error: error.message,
        missing: error.missing,
        code: error.code,
      }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Transition failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
