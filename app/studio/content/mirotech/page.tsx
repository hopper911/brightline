import { notFound, redirect } from "next/navigation";
import { StudioContentTable } from "@/components/studio/StudioContentTable";
import { canReadMirotechStudioContent } from "@/lib/studio/access";
import { listStudioContentForTenant } from "@/lib/studio/content/list-studio-content";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioMirotechContentPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canReadMirotechStudioContent(context.permissions, legacyAdmin)) {
    notFound();
  }

  if (!legacyAdmin && context.activeTenant !== "mirotech") {
    redirect(`/studio/content/${context.activeTenant}`);
  }

  const listing = await listStudioContentForTenant("mirotech");

  if (!listing.enabled) {
    return (
      <div>
        <h2 className="font-display text-2xl text-white">MiroTech content</h2>
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/60">
          ContentService is disabled. Set PLATFORM_CONTENT_ENABLED=true to list hub projects and
          case studies through the platform layer.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-white">MiroTech content</h2>
      <p className="mt-2 text-sm text-white/60">
        Studio Hub projects and Mirotech case studies via ContentService adapters.
      </p>
      <div className="mt-6">
        <StudioContentTable sections={listing.sections} tenant="mirotech" />
      </div>
    </div>
  );
}
