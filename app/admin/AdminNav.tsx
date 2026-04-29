import Link from "next/link";
import { getAdminNav } from "@/lib/admin-nav";

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="contents lg:block lg:mt-5 lg:first:mt-0">
      <p className="hidden px-4 pb-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/35 lg:block">
        {label}
      </p>
      <div className="contents lg:flex lg:flex-col lg:gap-0.5">{children}</div>
    </div>
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
    "text-sm text-white/70 hover:text-white lg:rounded-lg lg:px-4 lg:py-2 lg:hover:bg-white/10";

  return (
    <nav className="fixed left-0 top-0 z-40 flex h-14 w-full items-center border-b border-white/10 bg-[#0b0e12] px-4 lg:h-screen lg:w-64 lg:flex-col lg:items-stretch lg:justify-start lg:gap-0 lg:border-r lg:border-b-0 lg:pt-6 lg:overflow-y-auto">
      <Link
        prefetch={false}
        href="/admin"
        className="shrink-0 font-display text-lg text-white lg:px-4 lg:pb-2"
      >
        Admin
      </Link>

      <div className="flex min-w-0 flex-1 flex-row flex-nowrap items-center gap-2 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-6">
        {visibleGroups.map((group) => (
          <NavGroup key={group.id} label={group.label}>
            {group.items.map((item) => (
              <Link key={item.id} prefetch={false} href={item.href} className={link}>
                {item.label}
              </Link>
            ))}
          </NavGroup>
        ))}
      </div>
    </nav>
  );
}
