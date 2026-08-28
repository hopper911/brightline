import { notFound, redirect } from "next/navigation";
import { StudioContentTable } from "@/components/studio/StudioContentTable";
import { canReadBrightlineStudioContent } from "@/lib/studio/access";
import { listStudioContentForTenant } from "@/lib/studio/content/list-studio-content";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioBrightlineContentPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canReadBrightlineStudioContent(context.permissions, legacyAdmin)) {
    notFound();
  }

  if (!legacyAdmin && context.activeTenant !== "brightline") {
    redirect(`/studio/content/${context.activeTenant}`);
  }

  const listing = await listStudioContentForTenant("brightline");

  if (!listing.enabled) {
    return (
      <div>
        <h2 className="font-display text-2xl text-white">Brightline content</h2>
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/60">
          ContentService is disabled. Set PLATFORM_CONTENT_ENABLED=true to list work and portfolio
          projects through the platform layer.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-white">Brightline content</h2>
      <p className="mt-2 text-sm text-white/60">
        Work projects and portfolio projects via ContentService adapters.
      </p>
      <div className="mt-6">
        <StudioContentTable sections={listing.sections} tenant="brightline" />
      </div>
    </div>
  );
}
