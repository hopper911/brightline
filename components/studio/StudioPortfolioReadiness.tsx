"use client";

import Link from "next/link";
import type { TenantPortfolioReadiness } from "@/lib/platform/portfolio/readiness-types";

type Props = {
  report: {
    generatedAt: string;
    brightline: TenantPortfolioReadiness;
    mirotech: TenantPortfolioReadiness;
  };
  allowedTenants: string[];
};

function readinessClass(ready: boolean): string {
  return ready
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
    : "border-rose-400/30 bg-rose-400/10 text-rose-100";
}

function TenantReadinessCard({ tenant }: { tenant: TenantPortfolioReadiness }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl text-white">{tenant.title}</h3>
          <p className="mt-1 text-sm text-white/45">{tenant.tenant}</p>
        </div>
        <div className="text-right">
          <p className="tabular-nums text-3xl font-medium text-white">{tenant.score}%</p>
          <span
            className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${readinessClass(tenant.ready)}`}
          >
            {tenant.ready ? "Ready" : "Not ready"}
          </span>
        </div>
      </div>

      {tenant.blockers.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider text-rose-200/70">Blockers</p>
          <ul className="mt-2 space-y-2">
            {tenant.blockers.map((item) => (
              <li key={item.id} className="rounded-lg border border-rose-300/20 bg-rose-400/5 px-3 py-2 text-sm text-rose-50/90">
                <span className="font-medium">{item.label}</span>
                {item.detail ? <p className="mt-0.5 text-xs text-rose-100/70">{item.detail}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tenant.warnings.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider text-amber-200/70">Warnings</p>
          <ul className="mt-2 space-y-2">
            {tenant.warnings.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-amber-300/20 bg-amber-400/5 px-3 py-2 text-sm text-amber-50/90"
              >
                <span className="font-medium">{item.label}</span>
                {item.detail ? <p className="mt-0.5 text-xs text-amber-100/70">{item.detail}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tenant.blockers.length === 0 && tenant.warnings.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">All configured checks passed.</p>
      ) : null}

      <details className="mt-6">
        <summary className="cursor-pointer text-xs uppercase tracking-wider text-white/40">
          All checks ({tenant.checks.length})
        </summary>
        <ul className="mt-3 space-y-1 text-sm text-white/60">
          {tenant.checks.map((check) => (
            <li key={check.id} className="flex items-start gap-2">
              <span className={check.passed ? "text-emerald-300/80" : "text-rose-300/80"}>
                {check.passed ? "✓" : "✗"}
              </span>
              <span>
                {check.label}
                {check.detail ? <span className="text-white/40"> — {check.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function StudioPortfolioReadiness({ report, allowedTenants }: Props) {
  const showBrightline = allowedTenants.includes("brightline");
  const showMirotech = allowedTenants.includes("mirotech");

  return (
    <div className="space-y-8">
      <p className="text-xs text-white/40">
        Generated {new Date(report.generatedAt).toLocaleString()}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {showBrightline ? <TenantReadinessCard tenant={report.brightline} /> : null}
        {showMirotech ? <TenantReadinessCard tenant={report.mirotech} /> : null}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/studio/projects/completion"
          className="rounded-lg border border-white/15 px-3 py-2 text-white/70 hover:text-white"
        >
          Completion queue
        </Link>
        <Link
          href="/studio/publishing"
          className="rounded-lg border border-white/15 px-3 py-2 text-white/70 hover:text-white"
        >
          Publishing jobs
        </Link>
      </div>
    </div>
  );
}
