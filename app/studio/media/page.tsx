import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioMediaTable } from "@/components/studio/StudioMediaTable";
import { canReadStudioMedia } from "@/lib/studio/access";
import { listStudioAssetsForTenant } from "@/lib/studio/media/list-studio-assets";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import { MEDIA_OPS_LINKS, filterOpsLinks } from "@/lib/studio/ops/nav";

type Props = {
  searchParams: Promise<{ cursor?: string }>;
};

export default async function StudioMediaPage({ searchParams }: Props) {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canReadStudioMedia(context.permissions, legacyAdmin)) {
    notFound();
  }

  const params = await searchParams;
  const tenant = context.activeTenant;
  const listing = await listStudioAssetsForTenant(tenant, { cursor: params.cursor });

  const adminLinks = filterOpsLinks(MEDIA_OPS_LINKS, context.permissions, legacyAdmin);

  return (
    <div>
      <h2 className="font-display text-2xl text-white">Media</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Asset registry browser for tenant <span className="text-white">{tenant}</span>. Full R2
        management remains in admin tools.
      </p>

      {!listing.enabled ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/60">
          Asset registry is disabled. Set PLATFORM_ASSET_REGISTRY_ENABLED=true to list registered
          assets. Legacy media is still available via admin links below.
        </p>
      ) : (
        <div className="mt-6">
          <StudioMediaTable
            tenant={tenant}
            items={listing.items}
            nextCursor={listing.nextCursor}
            partialCoverage={listing.partialCoverage}
          />
        </div>
      )}

      <div className="mt-8 border-t border-white/10 pt-6">
        <p className="text-sm font-medium text-white">Legacy admin media tools</p>
        <ul className="mt-3 space-y-2">
          {adminLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-sm text-white/65 hover:text-white">
                {link.label} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
