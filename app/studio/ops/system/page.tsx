import Link from "next/link";
import { SYSTEM_OPS_LINKS, filterOpsLinks } from "@/lib/studio/ops/nav";
import { getPlatformHealthSnapshot } from "@/lib/platform/observability/health";
import { getPlatformMetricsSnapshot } from "@/lib/platform/observability/metrics-snapshot";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

function statusLabel(value: string): string {
  if (value === "ok") return "OK";
  if (value === "disabled") return "Disabled";
  if (value === "error") return "Error";
  if (value === "degraded") return "Degraded";
  return "Needs attention";
}

function metricCell(value: number): string {
  return value.toLocaleString();
}

export default async function StudioOpsSystemPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const [health, metrics] = await Promise.all([
    getPlatformHealthSnapshot({ extended: true }),
    getPlatformMetricsSnapshot(),
  ]);

  const links = filterOpsLinks(
    SYSTEM_OPS_LINKS,
    context.permissions,
    context.subjectKind === "legacy_admin"
  );

  return (
    <div>
      <h2 className="font-display text-2xl text-white">System</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Platform identity, health probes, operational metrics, and diagnostic endpoints.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {Object.entries(context.systemStatus).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">{key}</p>
            <p className="mt-1 text-lg text-white">{statusLabel(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
        <p className="font-medium text-white">Health snapshot</p>
        <p className="mt-1 text-xs text-white/45">Updated {health.ts}</p>
        <ul className="mt-3 space-y-1">
          <li>App: {statusLabel(health.checks.app)}</li>
          <li>Database: {statusLabel(health.checks.database)}</li>
          {health.extended ? (
            <>
              <li>Sentry configured: {health.extended.sentryConfigured ? "yes" : "no"}</li>
              <li>SSO configured: {health.extended.ssoConfigured ? "yes" : "no"}</li>
              <li>Vercel env: {health.extended.vercelEnv ?? "local"}</li>
            </>
          ) : null}
        </ul>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
        <p className="font-medium text-white">Metrics (last {metrics.windowHours}h)</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Jobs</p>
            <ul className="mt-2 space-y-1">
              <li>Pending: {metricCell(metrics.jobs.pending)}</li>
              <li>Failed: {metricCell(metrics.jobs.failed)}</li>
              <li>Publishing failed: {metricCell(metrics.jobs.publishingFailed)}</li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Identity / media</p>
            <ul className="mt-2 space-y-1">
              <li>SSO failures: {metricCell(metrics.audit.ssoFailed)}</li>
              <li>Asset missing: {metricCell(metrics.assetRead.missing)}</li>
              <li>Asset fallback: {metricCell(metrics.assetRead.fallbackLegacy)}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
        <p className="font-medium text-white">Platform flags</p>
        <ul className="mt-2 space-y-1">
          {Object.entries(context.platformFlags).map(([flag, on]) => (
            <li key={flag}>
              {flag}: {on ? "on" : "off"}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 grid gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target={link.href.startsWith("/api/") || link.external ? "_blank" : undefined}
            rel={
              link.href.startsWith("/api/") || link.external ? "noopener noreferrer" : undefined
            }
            className="block rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            <p className="text-base text-white">
              {link.label}
              {link.href.startsWith("/api/") ? " ↗" : ""}
            </p>
            <p className="mt-1 text-sm text-white/55">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
