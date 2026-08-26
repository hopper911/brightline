import Link from "next/link";
import { getAdminNav } from "@/lib/admin-nav";

/**
 * PERMANENT LOCK — admin sidebar scroll. Do not change.
 *
 * Desktop scroll: globals.css (`.admin-nav-shell` / `.admin-nav-scroll`) + `data-lenis-prevent`.
 * Lenis must stay off on operator routes (`app/providers.tsx`).
 * Rule: `.cursor/rules/admin-sidebar-scroll.mdc`
 *
 * Do not “fix” by putting overflow-y on body/main, removing these classes,
 * re-enabling Lenis on /admin, or rewriting this layout.
 */

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="contents lg:mt-5 lg:block lg:first:mt-0">
      <p className="hidden px-4 pb-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/35 lg:block">
        {label}
      </p>
      <div className="contents lg:flex lg:flex-col lg:gap-0.5">{children}</div>
    </div>
  );
}

function isExternalOrHandoff(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("/api/admin/mirotech/")
  );
}

export default async function AdminNav() {
  const groups = await getAdminNav();
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => item.visible),
    }))
    .filter((g) => g.items.length > 0);

  const link =
    "admin-nav-link shrink-0 text-sm text-white/70 hover:text-white lg:rounded-lg lg:px-4 lg:py-2 lg:hover:bg-white/10";

  return (
    <nav className="admin-nav-shell fixed left-0 top-0 z-40 flex h-14 w-full items-center border-b border-white/10 bg-[#0b0e12] px-4 lg:border-r lg:border-b-0">
      <Link
        prefetch={false}
        href="/admin"
        className="admin-nav-brand shrink-0 font-display text-lg text-white lg:px-4 lg:pb-3 lg:pt-6"
      >
        Admin
      </Link>

      {/* PERMANENT: data-lenis-prevent — nested rail scroll; do not remove */}
      <div className="admin-nav-scroll" data-lenis-prevent>
        {visibleGroups.map((group) => (
          <NavGroup key={group.id} label={group.label}>
            {group.items.map((item) =>
              isExternalOrHandoff(item.href) ? (
                <a
                  key={item.id}
                  href={item.href}
                  className={link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.label}
                  {item.href.startsWith("http") || item.href.includes("handoff") ? " ↗" : ""}
                </a>
              ) : (
                <Link key={item.id} prefetch={false} href={item.href} className={link}>
                  {item.label}
                </Link>
              )
            )}
          </NavGroup>
        ))}
      </div>
    </nav>
  );
}
