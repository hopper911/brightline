"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { STUDIO_PLATFORM_NAV } from "@/lib/studio/platform-nav";
import type { StudioOpsContext } from "@/lib/studio/ops/types";

type Props = {
  context: StudioOpsContext;
  children: React.ReactNode;
};

export function StudioPlatformShell({ context, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const onTenantChange = useCallback(
    async (tenant: string) => {
      setSwitching(true);
      try {
        const res = await fetch("/api/studio/ops/tenant", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant }),
        });
        if (res.ok) router.refresh();
      } finally {
        setSwitching(false);
      }
    },
    [router]
  );

  const primaryNav = STUDIO_PLATFORM_NAV.filter((item) => !("parent" in item && item.parent));

  return (
    <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
      <div className="border-b border-white/10 bg-[#0a0d12]/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Studio</p>
            <h1 className="font-display text-2xl text-white">Control plane</h1>
            <p className="mt-1 text-sm text-white/55">
              Content and media through platform services — editors remain in admin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-white/45" htmlFor="studio-platform-tenant">
              Tenant
            </label>
            <select
              id="studio-platform-tenant"
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              value={context.activeTenant}
              disabled={switching || context.memberships.length <= 1}
              onChange={(e) => onTenantChange(e.target.value)}
            >
              {context.memberships.map((m) => (
                <option key={m.tenantSlug} value={m.tenantSlug}>
                  {m.tenantSlug} · {m.role}
                </option>
              ))}
            </select>
            <Link href="/studio" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 hover:text-white">
              Mission Control
            </Link>
            <Link href="/studio/ops" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 hover:text-white">
              Ops
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[14rem_1fr]">
        <nav className="space-y-1">
          {primaryNav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/studio/content" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "border border-white/20 bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="mt-4 border-t border-white/10 pt-3">
            <Link
              href={`/studio/content/${context.activeTenant}`}
              className="block rounded-lg px-3 py-2 text-xs text-white/55 hover:text-white"
            >
              Active tenant content →
            </Link>
          </div>
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
