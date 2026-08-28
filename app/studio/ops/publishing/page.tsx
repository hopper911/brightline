import { StudioOpsLinkGrid } from "@/components/studio/StudioOpsLinkGrid";
import { PUBLISHING_OPS_LINKS, filterOpsLinks } from "@/lib/studio/ops/nav";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioOpsPublishingPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const links = filterOpsLinks(
    PUBLISHING_OPS_LINKS,
    context.permissions,
    context.subjectKind === "legacy_admin"
  );

  return (
    <StudioOpsLinkGrid
      title="Publishing"
      description="Distribution and sync entry points — hub publish, blog journal sync, and delivery projects."
      links={links}
    />
  );
}
