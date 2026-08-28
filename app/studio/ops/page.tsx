import Link from "next/link";
import { STUDIO_OPS_NAV } from "@/lib/studio/ops/nav";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioOpsOverviewPage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const sections = STUDIO_OPS_NAV.filter((item) => item.id !== "overview" && context.sections.includes(item.id));

  return (
    <div>
      <h2 className="font-display text-2xl text-white">Overview</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Operational control plane for Brightline and MiroTech. This shell links to existing admin
        surfaces — workflows are not migrated here in Phase 9A.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="block rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            <p className="text-base text-white">{section.label}</p>
            <p className="mt-1 text-sm text-white/55">{section.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
        <p>
          Active tenant: <span className="text-white">{context.activeTenant}</span>
        </p>
        <p className="mt-1">
          Identity: {context.identityEnabled ? context.subjectKind : "legacy only"} · SSO{" "}
          {context.ssoAvailable ? "available" : "off"} · Handoff fallback{" "}
          {context.legacyHandoffEnabled ? "on" : "off"}
        </p>
      </div>
    </div>
  );
}
