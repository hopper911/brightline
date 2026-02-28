"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AdminLogoutButton from "./logout-button";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/work", label: "Work" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/settings", label: "Settings" },
] as const;

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
    </>
  );
}

export default function AdminNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isLogin = pathname?.startsWith("/admin/login");

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  if (isLogin) {
    return null;
  }

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      {/* Mobile top bar (below lg) */}
      <header
        className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-white/10 bg-[#0b0e12] px-4 lg:hidden"
        aria-label="Admin header"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="-ml-1 rounded p-2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <Link
          href="/admin"
          className="font-display text-lg font-medium text-white/90 hover:text-white"
        >
          Admin
        </Link>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={closeDrawer}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0b0e12] transition-transform duration-200 ease-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Admin navigation (mobile)"
        aria-modal="true"
        role="dialog"
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <span className="font-display text-lg font-medium text-white/90">
            Menu
          </span>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          <NavLinks pathname={pathname} onNavigate={closeDrawer} />
        </nav>
        <div className="border-t border-white/10 p-2">
          <AdminLogoutButton />
        </div>
      </aside>

      {/* Desktop sidebar (lg and up) */}
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
          <NavLinks pathname={pathname} />
        </nav>
        <div className="border-t border-white/10 p-2">
          <AdminLogoutButton />
        </div>
      </aside>
    </>
  );
}
