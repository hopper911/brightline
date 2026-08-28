"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { STUDIO_OPS_NAV } from "@/lib/studio/ops/nav";
import type { StudioOpsContext } from "@/lib/studio/ops/types";

type Props = {
  context: StudioOpsContext;
  children: React.ReactNode;
};

export function StudioOpsShell({ context, children }: Props) {
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

  const visibleNav = STUDIO_OPS_NAV.filter((item) => context.sections.includes(item.id));

  return (
    <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
      <div className="border-b border-white/10 bg-[#0a0d12]/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Studio</p>
            <h1 className="font-display text-2xl text-white">Operational shell</h1>
            <p className="mt-1 text-sm text-white/55">
              Control plane for brands, content, media, publishing, and platform status — links to
              existing admin tools.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-white/45" htmlFor="studio-ops-tenant">
              Tenant
            </label>
            <select
              id="studio-ops-tenant"
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
            <Link href="/admin" className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 hover:text-white">
              Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[14rem_1fr]">
        <nav className="space-y-1">
          {visibleNav.map((item) => {
            const active = pathname === item.href || (item.href !== "/studio/ops" && pathname.startsWith(item.href));
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
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
