import { StudioOpsLinkGrid } from "@/components/studio/StudioOpsLinkGrid";
import { MIROTECH_OPS_LINKS, filterOpsLinks } from "@/lib/studio/ops/nav";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioOpsMirotechPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const links = filterOpsLinks(
    MIROTECH_OPS_LINKS,
    context.permissions,
    context.subjectKind === "legacy_admin"
  );

  return (
    <StudioOpsLinkGrid
      title="MiroTech"
      description="Mirotech.solutions brand operations — SSO preferred when configured; handoff remains as emergency fallback."
      links={links}
    />
  );
}
