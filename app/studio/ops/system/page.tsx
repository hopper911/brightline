import Link from "next/link";
import { SYSTEM_OPS_LINKS, filterOpsLinks } from "@/lib/studio/ops/nav";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

function statusLabel(value: string): string {
  if (value === "ok") return "OK";
  if (value === "disabled") return "Disabled";
  return "Needs attention";
}

export default async function StudioOpsSystemPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const links = filterOpsLinks(
    SYSTEM_OPS_LINKS,
    context.permissions,
    context.subjectKind === "legacy_admin"
  );

  return (
    <div>
      <h2 className="font-display text-2xl text-white">System</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Platform identity, SSO, feature flags, and probe endpoints. Placeholders until deeper
        observability ships in Phase 9B.
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
            target={link.href.startsWith("/api/") ? "_blank" : undefined}
            rel={link.href.startsWith("/api/") ? "noopener noreferrer" : undefined}
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
