"use client";

import Link from "next/link";

export default function AdminNav() {
  return (
    <nav className="fixed left-0 top-0 z-40 flex h-14 w-full items-center border-b border-white/10 bg-[#0b0e12] px-4 lg:h-screen lg:w-64 lg:flex-col lg:items-stretch lg:justify-start lg:gap-2 lg:border-r lg:border-b-0 lg:pt-6">
      <Link
        href="/admin"
        className="font-display text-lg text-white lg:px-4 lg:pb-4"
      >
        Admin
      </Link>
      <div className="flex gap-4 lg:flex-col lg:gap-1">
        <Link
          href="/admin/work"
          className="text-sm text-white/70 hover:text-white lg:rounded-lg lg:px-4 lg:py-2 lg:hover:bg-white/10"
        >
          Work
        </Link>
        <Link
          href="/admin/media"
          className="text-sm text-white/70 hover:text-white lg:rounded-lg lg:px-4 lg:py-2 lg:hover:bg-white/10"
        >
          Media
        </Link>
        <Link
          href="/admin/clients"
          className="text-sm text-white/70 hover:text-white lg:rounded-lg lg:px-4 lg:py-2 lg:hover:bg-white/10"
        >
          Clients
        </Link>
        <Link
          href="/admin/galleries"
          className="text-sm text-white/70 hover:text-white lg:rounded-lg lg:px-4 lg:py-2 lg:hover:bg-white/10"
        >
          Galleries
        </Link>
        <Link
          href="/admin/leads"
          className="text-sm text-white/70 hover:text-white lg:rounded-lg lg:px-4 lg:py-2 lg:hover:bg-white/10"
        >
          Leads
        </Link>
      </div>
    </nav>
  );
}
