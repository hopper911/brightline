import { StudioOpsLinkGrid } from "@/components/studio/StudioOpsLinkGrid";
import { MEDIA_OPS_LINKS, filterOpsLinks } from "@/lib/studio/ops/nav";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioOpsMediaPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const links = filterOpsLinks(
    MEDIA_OPS_LINKS,
    context.permissions,
    context.subjectKind === "legacy_admin"
  );

  return (
    <StudioOpsLinkGrid
      title="Media"
      description="Media libraries and R2 tooling — Brightline unified library plus Mirotech command center."
      links={links}
    />
  );
}
