import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  PROJECT_WORKFLOW_PRIORITIES,
  getStoredProjectWorkflowState,
  setStoredProjectWorkflowState,
  type ProjectWorkflowPriority,
} from "@/lib/platform/projects/workflow-state";
import { canWriteStudioProject } from "@/lib/studio/access";
import { parseStudioProjectRefParam } from "@/lib/studio/projects/project-ref";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const opsContext = await resolveStudioOpsContext(req);
  if (!opsContext) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    projectRef?: string;
    priority?: string;
  } | null;

  const projectRef = body?.projectRef?.trim();
  const priority = body?.priority?.trim().toUpperCase();
  if (!projectRef) {
    return NextResponse.json({ ok: false, error: "projectRef is required." }, { status: 400 });
  }
  if (!priority || !PROJECT_WORKFLOW_PRIORITIES.includes(priority as ProjectWorkflowPriority)) {
    return NextResponse.json({ ok: false, error: "priority must be HIGH, NORMAL, or LOW." }, { status: 400 });
  }

  const ref = parseStudioProjectRefParam(projectRef);
  if (!ref || ref.type !== "work-project" && ref.type !== "mirotech-case-study") {
    return NextResponse.json({ ok: false, error: "Invalid project ref." }, { status: 400 });
  }

  const legacyAdmin = opsContext.subjectKind === "legacy_admin";
  if (!canWriteStudioProject(ref.tenant, opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const stored = await getStoredProjectWorkflowState(ref);
  if (!stored) {
    return NextResponse.json({ ok: false, error: "Workflow state not found." }, { status: 404 });
  }

  await setStoredProjectWorkflowState(ref, {
    ...stored,
    priority: priority as ProjectWorkflowPriority,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, priority });
}
