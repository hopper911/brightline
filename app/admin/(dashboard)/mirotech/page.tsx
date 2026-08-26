import type { Metadata } from "next";
import Link from "next/link";
import {
  isMirotechHandoffConfigured,
  mirotechSiteOrigin,
} from "@/lib/mirotech-admin-handoff";

export const metadata: Metadata = {
  title: "Admin · Mirotech",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const LINKS: Array<{ label: string; description: string; next: string }> = [
  {
    label: "Dashboard",
    description: "Mirotech.solutions admin home",
    next: "/admin",
  },
  {
    label: "Projects",
    description: "Dual-brand Work / case studies",
    next: "/admin/projects",
  },
  {
    label: "Journal",
    description: "Photo + design/tech post variants",
    next: "/admin/journal",
  },
  {
    label: "Media",
    description: "Mirotech R2 media library",
    next: "/admin/media",
  },
  {
    label: "Homepage",
    description: "Public homepage CMS",
    next: "/admin/homepage",
  },
];

export default function MirotechAdminHubPage() {
  const configured = isMirotechHandoffConfigured();
  const site = mirotechSiteOrigin();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Mirotech</p>
      <h1 className="mt-2 font-display text-3xl text-white">mirotech.solutions</h1>
      <p className="mt-3 max-w-xl text-sm text-white/60">
        Open the Mirotech CMS dashboard from Brightline admin. When handoff is configured, you skip
        the Mirotech login screen.
      </p>

      {!configured ? (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Set the same <code className="font-mono text-xs">MIROTECH_ADMIN_HANDOFF_SECRET</code>{" "}
          (32+ characters) on Brightline and Mirotech Vercel projects, plus{" "}
          <code className="font-mono text-xs">MIROTECH_SITE_URL={site}</code> on Brightline, then
          redeploy both.
        </div>
      ) : null}

      <div className="mt-8 grid gap-3">
        {LINKS.map((item) => (
          <a
            key={item.next}
            href={
              configured
                ? `/api/admin/mirotech/handoff?next=${encodeURIComponent(item.next)}`
                : `${site}${item.next}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            <p className="text-base text-white">{item.label}</p>
            <p className="mt-1 text-sm text-white/55">{item.description}</p>
          </a>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <a
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/15 px-3 py-2 text-white/70 hover:text-white"
        >
          View public site →
        </a>
        <Link href="/admin" className="rounded-lg border border-white/15 px-3 py-2 text-white/70 hover:text-white">
          ← Brightline admin
        </Link>
      </div>
    </div>
  );
}
