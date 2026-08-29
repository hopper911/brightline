import type { ProjectWorkflowKind } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/** Deep-link into the existing admin editor for a workflow project. */
export function studioProjectEditHref(
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
