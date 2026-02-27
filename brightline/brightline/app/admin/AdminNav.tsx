"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminLogoutButton from "./logout-button";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/work", label: "Work" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export default function AdminNav() {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/admin/login");

  if (isLogin) {
    return null;
  }

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/10 bg-[#0b0e12] lg:flex"
      aria-label="Admin navigation"
    >
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <Link
          href="/admin"
          className="font-display text-lg font-medium text-white/90 hover:text-white"
        >
          Admin
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-2">
        <AdminLogoutButton />
      </div>
    </aside>
  );
}
