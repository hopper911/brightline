import { StudioOpsLinkGrid } from "@/components/studio/StudioOpsLinkGrid";
import { BRIGHTLINE_OPS_LINKS, filterOpsLinks } from "@/lib/studio/ops/nav";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioOpsBrightlinePage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const links = filterOpsLinks(
    BRIGHTLINE_OPS_LINKS,
    context.permissions,
    context.subjectKind === "legacy_admin"
  );

  return (
    <StudioOpsLinkGrid
      title="Brightline"
      description="Brightline Photography brand operations — links to existing /admin and /studio tools."
      links={links}
    />
  );
}
