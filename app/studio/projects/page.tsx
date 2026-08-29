import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioProjectCreateForm } from "@/components/studio/StudioProjectCreateForm";
import { StudioProjectsTable } from "@/components/studio/StudioProjectsTable";
import { allowedProjectTenants } from "@/lib/studio/access";
import { listStudioProjects } from "@/lib/studio/projects/list-studio-projects";
import { STUDIO_PROJECT_STATUS_LABELS } from "@/lib/studio/projects/status-filters";
import type { StudioProjectStatusFilter } from "@/lib/studio/projects/types";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import type { TenantSlug } from "@/lib/platform/tenants/types";

type Props = {
  searchParams: Promise<{
    tenant?: string;
    status?: string;
    page?: string;
  }>;
};

function parseTenantFilter(
  raw: string | undefined,
  allowed: TenantSlug[]
): TenantSlug | "all" {
  if (raw === "all" && allowed.length > 1) return "all";
  if (raw === "brightline" || raw === "mirotech") {
    return allowed.includes(raw) ? raw : allowed[0] ?? "brightline";
  }
  return allowed.length > 1 ? "all" : allowed[0] ?? "brightline";
}

function parseStatusFilter(raw: string | undefined): StudioProjectStatusFilter {
  const filters: StudioProjectStatusFilter[] = [
    "all",
    "draft",
    "needs-content",
    "needs-media",
    "review",
    "approved",
    "published",
  ];
  if (raw && filters.includes(raw as StudioProjectStatusFilter)) {
    return raw as StudioProjectStatusFilter;
  }
  return "all";
}

export default async function StudioProjectsPage({ searchParams }: Props) {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  const allowedTenants = allowedProjectTenants(
    context.permissions,
    legacyAdmin,
    context.memberships
  );
  if (!allowedTenants.length) {
    notFound();
  }

  const params = await searchParams;
  const tenantFilter = parseTenantFilter(params.tenant, allowedTenants);
  const statusFilter = parseStatusFilter(params.status);
  const page = params.page ? Number(params.page) : 1;

  const listing = await listStudioProjects({
    memberships: context.memberships,
    permissions: context.permissions,
    legacyAdmin,
    tenantFilter,
    statusFilter,
    page: Number.isFinite(page) ? page : 1,
  });

  const totalPages = Math.max(1, Math.ceil(listing.total / listing.pageSize));
  const statusFilters: StudioProjectStatusFilter[] = [
    "all",
    "draft",
    "needs-content",
    "needs-media",
    "review",
    "approved",
    "published",
  ];

  function buildHref(overrides: { tenant?: string; status?: string; page?: number }) {
    const q = new URLSearchParams();
    const t = overrides.tenant ?? tenantFilter;
    const s = overrides.status ?? statusFilter;
    const p = overrides.page ?? listing.page;
    if (t !== "all" || allowedTenants.length > 1) q.set("tenant", t);
    if (s !== "all") q.set("status", s);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return qs ? `/studio/projects?${qs}` : "/studio/projects";
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-white">Projects</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Workflow ingestion for Brightline work case studies and MiroTech hub case studies.
            Completeness and lifecycle come from ProjectWorkflowService validators.
          </p>
        </div>
        <StudioProjectCreateForm
          allowedTenants={allowedTenants}
          canCreateBrightline={listing.canCreateBrightline}
          canCreateMirotech={listing.canCreateMirotech}
          defaultTenant={context.activeTenant}
        />
      </div>

      {allowedTenants.length > 1 ? (
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {(["all", ...allowedTenants] as const).map((t) => {
            if (t === "all" && allowedTenants.length <= 1) return null;
            const active = tenantFilter === t;
            return (
              <Link
                key={t}
                href={buildHref({ tenant: t, page: 1 })}
                className={`rounded-lg border px-3 py-1.5 ${
                  active
                    ? "border-white/25 bg-white/10 text-white"
                    : "border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {t === "all" ? "All authorized" : t === "brightline" ? "Brightline" : "MiroTech"}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {statusFilters.map((status) => {
          const active = statusFilter === status;
          const label = status === "all" ? "All statuses" : STUDIO_PROJECT_STATUS_LABELS[status];
          return (
            <Link
              key={status}
              href={buildHref({ status, page: 1 })}
              className={`rounded-lg border px-3 py-1.5 ${
                active
                  ? "border-white/25 bg-white/10 text-white"
                  : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <StudioProjectsTable items={listing.items} emptyMessage={listing.emptyMessage} />
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-between text-sm text-white/60">
          <p>
            Page {listing.page} of {totalPages} · {listing.total} projects
          </p>
          <div className="flex gap-2">
            {listing.page > 1 ? (
              <Link
                href={buildHref({ page: listing.page - 1 })}
                className="rounded border border-white/15 px-3 py-1 hover:text-white"
              >
                Previous
              </Link>
            ) : null}
            {listing.page < totalPages ? (
              <Link
                href={buildHref({ page: listing.page + 1 })}
                className="rounded border border-white/15 px-3 py-1 hover:text-white"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
