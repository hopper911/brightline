import { StudioOpsLinkGrid } from "@/components/studio/StudioOpsLinkGrid";
import { CONTENT_OPS_LINKS, filterOpsLinks } from "@/lib/studio/ops/nav";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioOpsContentPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const links = filterOpsLinks(
    CONTENT_OPS_LINKS,
    context.permissions,
    context.subjectKind === "legacy_admin"
  );

  return (
    <StudioOpsLinkGrid
      title="Content"
      description="Dual-brand content surfaces — Studio Hub, work, design, and journal tools (existing admin pages)."
      links={links}
    />
  );
}
