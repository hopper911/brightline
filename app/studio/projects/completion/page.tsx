import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioCompletionQueue } from "@/components/studio/StudioCompletionQueue";
import { allowedProjectTenants } from "@/lib/studio/access";
import { listProjectCompletionQueue } from "@/lib/studio/projects/completion-queue";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import type { TenantSlug } from "@/lib/platform/tenants/types";

type Props = {
  searchParams: Promise<{ tenant?: string }>;
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

export default async function StudioCompletionQueuePage({ searchParams }: Props) {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  const allowedTenants = allowedProjectTenants(
    context.permissions,
    legacyAdmin,
    context.memberships
  );
  if (!allowedTenants.length) notFound();

  const params = await searchParams;
  const tenantFilter = parseTenantFilter(params.tenant, allowedTenants);

  const queue = await listProjectCompletionQueue({
    memberships: context.memberships,
    permissions: context.permissions,
    legacyAdmin,
    tenantFilter,
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-white">Completion queue</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            What is blocking the portfolio from being complete — grouped by blocker type and workflow stage.
          </p>
        </div>
        <Link
          href="/studio/projects"
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:text-white"
        >
          All projects
        </Link>
      </div>

      <div className="mt-8">
        <StudioCompletionQueue
          tenantFilter={queue.tenantFilter}
          sections={queue.sections}
          totals={queue.totals}
          canWrite={queue.canWrite}
          allowedTenants={allowedTenants}
        />
      </div>
    </div>
  );
}
