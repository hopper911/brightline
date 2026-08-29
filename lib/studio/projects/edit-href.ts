import type { ProjectWorkflowKind } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import { encodeStudioProjectRefParam } from "@/lib/studio/projects/project-ref";

/** Studio project editor route. */
export function studioProjectEditHref(
  tenant: TenantSlug,
  kind: ProjectWorkflowKind,
  id: string
): string {
  const ref =
    kind === "work-project"
      ? { tenant: "brightline" as const, type: "work-project" as const, id }
      : { tenant: "mirotech" as const, type: "mirotech-case-study" as const, id };
  return `/studio/projects/${encodeStudioProjectRefParam(ref)}`;
}

/** Legacy admin monolith editor (transition link). */
export function studioProjectLegacyAdminHref(
  tenant: TenantSlug,
  kind: ProjectWorkflowKind,
  id: string
): string {
  if (tenant === "brightline" && kind === "work-project") {
    return `/admin/work/${encodeURIComponent(id)}`;
  }
  if (tenant === "mirotech" && kind === "mirotech-case-study") {
    return `/admin/studio-cms/${encodeURIComponent(id)}`;
  }
  return "/studio/projects";
}

export function studioProjectPreviewHref(
  tenant: TenantSlug,
  kind: ProjectWorkflowKind,
  id: string
): string | null {
  if (tenant === "brightline" && kind === "work-project") {
    return `/admin/work/preview/${encodeURIComponent(id)}`;
  }
  if (tenant === "mirotech" && kind === "mirotech-case-study") {
    return `/admin/studio-cms/${encodeURIComponent(id)}/preview`;
  }
  return null;
}
