"use client";

import Link from "next/link";

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

export default function AdminNav() {
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
        <NavGroup label="Operate">
          <Link prefetch={false} href="/studio" className={link}>
            Mission Control
          </Link>
          <Link prefetch={false} href="/studio/finance" className={link}>
            Finance
          </Link>
          <Link prefetch={false} href="/admin/studio-leads" className={link}>
            Studio leads
          </Link>
          <Link prefetch={false} href="/admin/clients" className={link}>
            Clients
          </Link>
          <Link prefetch={false} href="/admin/automations" className={link}>
            Automations
          </Link>
        </NavGroup>

        <NavGroup label="Publish">
          <Link prefetch={false} href="/admin/pages" className={link}>
            Website pages
          </Link>
          <Link prefetch={false} href="/admin/services" className={link}>
            Service pages
          </Link>
          <Link prefetch={false} href="/admin/work" className={link}>
            Work
          </Link>
          <Link prefetch={false} href="/admin/projects" className={link}>
            Studio CMS
          </Link>
          <Link prefetch={false} href="/admin/portfolio" className={link}>
            Portfolio
          </Link>
        </NavGroup>

        <NavGroup label="Deliver">
          <Link prefetch={false} href="/admin/galleries" className={link}>
            Galleries
          </Link>
          <Link prefetch={false} href="/admin/client-access" className={link}>
            Gallery access
          </Link>
        </NavGroup>

        <NavGroup label="Assets">
          <Link prefetch={false} href="/admin/media" className={link}>
            Media
          </Link>
        </NavGroup>

        <NavGroup label="Insight">
          <Link prefetch={false} href="/admin/analytics" className={link}>
            Analytics
          </Link>
          <Link prefetch={false} href="/admin/settings" className={link}>
            Settings
          </Link>
        </NavGroup>

        <NavGroup label="Legacy">
          <Link prefetch={false} href="/admin/leads" className={link}>
            Leads (legacy)
          </Link>
          <Link prefetch={false} href="/admin/tags" className={link}>
            Tags
          </Link>
          <Link prefetch={false} href="/admin/testimonials" className={link}>
            Testimonials
          </Link>
        </NavGroup>
      </div>
    </nav>
  );
}
