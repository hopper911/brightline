import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioPortfolioReadiness } from "@/components/studio/StudioPortfolioReadiness";
import { evaluatePortfolioReadiness } from "@/lib/platform/portfolio/portfolio-readiness";
import { allowedProjectTenants } from "@/lib/studio/access";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioPortfolioReadinessPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  const allowedTenants = allowedProjectTenants(
    context.permissions,
    legacyAdmin,
    context.memberships
  );
  if (!allowedTenants.length) notFound();

  const report = await evaluatePortfolioReadiness();

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-white">Portfolio readiness</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Site-level launch gate — is each portfolio complete enough to ship?
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
        <StudioPortfolioReadiness report={report} allowedTenants={allowedTenants} />
      </div>
    </div>
  );
}
