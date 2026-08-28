import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioPublishingJobsTable } from "@/components/studio/StudioPublishingJobsTable";
import {
  allowedPublishingTenants,
  canViewStudioPublishing,
} from "@/lib/studio/access";
import { getStudioPublishingDashboard } from "@/lib/studio/publishing/list-publishing-dashboard";
import { PUBLISHING_OPS_LINKS, filterOpsLinks } from "@/lib/studio/ops/nav";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import type { TenantSlug } from "@/lib/platform/tenants/types";

type Props = {
  searchParams: Promise<{ cursor?: string; tenant?: string }>;
};

function parseTenantFilter(raw: string | undefined, allowed: TenantSlug[]): TenantSlug | "all" {
  if (raw === "all" && allowed.length > 1) return "all";
  if (raw === "brightline" || raw === "mirotech") {
    return allowed.includes(raw) ? raw : allowed[0] ?? "brightline";
  }
  return allowed.length > 1 ? "all" : allowed[0] ?? "brightline";
}

export default async function StudioPublishingPage({ searchParams }: Props) {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canViewStudioPublishing(context.permissions, legacyAdmin)) {
    notFound();
  }

  const params = await searchParams;
  const allowedTenants = allowedPublishingTenants(
    context.permissions,
    legacyAdmin,
    context.memberships
  );
  const tenantFilter = parseTenantFilter(params.tenant, allowedTenants);

  const dashboard = await getStudioPublishingDashboard({
    allowedTenants,
    tenantFilter,
    cursor: params.cursor,
  });

  const adminLinks = filterOpsLinks(PUBLISHING_OPS_LINKS, context.permissions, legacyAdmin);

  return (
    <div>
      <h2 className="font-display text-2xl text-white">Publishing</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Publishing jobs and distribution status via JobService — admin publish controls remain
        available during migration.
      </p>

      {!dashboard.enabled ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/60">
          Enable PLATFORM_PUBLISHING_ENABLED and/or PLATFORM_JOBS_ENABLED for Studio publishing
          operations.
        </p>
      ) : (
        <>
          {allowedTenants.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {(["all", ...allowedTenants] as const).map((t) => {
                if (t === "all" && allowedTenants.length <= 1) return null;
                const active = tenantFilter === t;
                const href =
                  t === "all"
                    ? "/studio/publishing?tenant=all"
                    : `/studio/publishing?tenant=${t}`;
                return (
                  <Link
                    key={t}
                    href={href}
                    className={`rounded-lg border px-3 py-1.5 ${
                      active
                        ? "border-white/25 bg-white/10 text-white"
                        : "border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {t === "all" ? "All permitted" : t}
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {(
              [
                ["Queued", dashboard.counts.pending],
                ["Running", dashboard.counts.running],
                ["Completed", dashboard.counts.completed],
                ["Failed", dashboard.counts.failed],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
                <p className="mt-1 text-2xl text-white">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="font-display text-lg text-white">Recent jobs</h3>
            <div className="mt-3">
              <StudioPublishingJobsTable jobs={dashboard.jobs} nextCursor={dashboard.nextCursor} />
            </div>
          </div>
        </>
      )}

      <div className="mt-8 border-t border-white/10 pt-6">
        <p className="text-sm font-medium text-white">Legacy admin publishing tools</p>
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
