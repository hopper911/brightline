import { notFound } from "next/navigation";
import { StudioProjectEditor } from "@/components/studio/StudioProjectEditor";
import {
  allowedProjectTenants,
  canReadBrightlineStudioProjects,
  canReadMirotechStudioProjects,
  canWriteStudioProject,
} from "@/lib/studio/access";
import { getStudioProjectEditorView } from "@/lib/studio/projects/get-studio-project-editor";
import { encodeStudioProjectRefParam, parseStudioProjectRefParam } from "@/lib/studio/projects/project-ref";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ projectRef: string }>;
  searchParams: Promise<{ tab?: string; workflow?: string }>;
};

export default async function StudioProjectEditorPage({ params, searchParams }: Props) {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const { projectRef } = await params;
  const sp = await searchParams;
  const initialTab = sp.tab === "media" || sp.tab === "seo" || sp.tab === "publishing" ? sp.tab : undefined;
  const workflowIntent =
    sp.workflow === "review" || sp.workflow === "publish" ? sp.workflow : undefined;
  const ref = parseStudioProjectRefParam(projectRef);
  if (!ref) notFound();

  const legacyAdmin = context.subjectKind === "legacy_admin";
  const allowed = allowedProjectTenants(context.permissions, legacyAdmin, context.memberships);
  if (!allowed.includes(ref.tenant)) notFound();

  const canRead =
    ref.tenant === "brightline"
      ? canReadBrightlineStudioProjects(context.permissions, legacyAdmin)
      : canReadMirotechStudioProjects(context.permissions, legacyAdmin);
  if (!canRead) notFound();

  const view = await getStudioProjectEditorView(ref, {
    permissions: context.permissions,
    legacyAdmin,
  });
  if (!view) notFound();

  const canWrite = canWriteStudioProject(ref.tenant, context.permissions, legacyAdmin);
  const param = encodeStudioProjectRefParam(ref);

  return (
    <StudioProjectEditor
      initialView={view}
      projectRefParam={param}
      canWrite={canWrite}
      initialTab={initialTab as "media" | "seo" | "publishing" | undefined}
      workflowIntent={workflowIntent}
    />
  );
}
