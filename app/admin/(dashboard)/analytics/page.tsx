import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

function parseDays(v: string | undefined): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 30;
  if (n <= 0) return 30;
  return Math.min(365, Math.max(1, Math.trunc(n)));
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; type?: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const sp = await searchParams;
  const days = parseDays(sp.days);
  const type = (sp.type ?? "").trim();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.analyticsSnapshot.findMany({
    where: {
      dateBucket: { gte: since },
      ...(type ? { pageType: type } : {}),
    },
    orderBy: [{ dateBucket: "desc" }],
    take: 2000,
    select: {
      dateBucket: true,
      pagePath: true,
      pageType: true,
      views: true,
      users: true,
      conversions: true,
      sourceMedium: true,
    },
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.views += r.views ?? 0;
      acc.users += r.users ?? 0;
      acc.conversions += r.conversions ?? 0;
      return acc;
    },
    { views: 0, users: 0, conversions: 0 }
  );

  const byDay = new Map<string, { views: number; users: number; conversions: number }>();
  for (const r of rows) {
    const k = r.dateBucket.toISOString().slice(0, 10);
    const cur = byDay.get(k) ?? { views: 0, users: 0, conversions: 0 };
    cur.views += r.views ?? 0;
    cur.users += r.users ?? 0;
    cur.conversions += r.conversions ?? 0;
    byDay.set(k, cur);
  }
  const daily = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 60);

  const byPath = new Map<string, { views: number; users: number }>();
  for (const r of rows) {
    const k = r.pagePath;
    const cur = byPath.get(k) ?? { views: 0, users: 0 };
    cur.views += r.views ?? 0;
    cur.users += r.users ?? 0;
    byPath.set(k, cur);
  }
  const topPages = [...byPath.entries()]
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 20);

  const pageTypes = Array.from(new Set(rows.map((r) => r.pageType))).sort();
  const linkForType = (t: string) => {
    const p = new URLSearchParams();
    p.set("days", String(days));
    if (t) p.set("type", t);
    return `?${p.toString()}`;
  };
  const linkForDays = (d: number) => {
    const p = new URLSearchParams();
    p.set("days", String(d));
    if (type) p.set("type", type);
    return `?${p.toString()}`;
  };
  const dayPresets = [7, 30, 90, 180, 365] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        Studio OS
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-white">Analytics</h1>
          <p className="mt-2 text-sm text-white/70">
            Snapshot rollups (last {days} days){type ? ` · ${type}` : ""}.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap justify-end gap-2">
            {dayPresets.map((d) => (
              <Link
                key={d}
                href={linkForDays(d)}
                className={`btn btn-ghost text-sm ${days === d ? "border border-white/30 bg-white/10" : ""}`}
              >
                {d}d
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={linkForType("")} className="btn btn-ghost">
              All types
            </Link>
            {pageTypes.map((t) => (
              <Link key={t} href={linkForType(t)} className="btn btn-ghost">
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Views</p>
          <p className="mt-2 text-3xl text-white">{totals.views.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Users</p>
          <p className="mt-2 text-3xl text-white">{totals.users.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Conversions</p>
          <p className="mt-2 text-3xl text-white">{totals.conversions.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="border-b border-white/10 bg-white/5 px-4 py-3 text-[0.65rem] uppercase tracking-[0.25em] text-white/60">
            Daily rollup (most recent)
          </div>
          <div className="divide-y divide-white/10">
            {daily.length === 0 ? (
              <div className="px-4 py-8 text-sm text-white/60">No snapshots yet.</div>
            ) : (
              daily.map(([day, v]) => (
                <div key={day} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm text-white/80">
                  <div className="col-span-4 text-white/60">{day}</div>
                  <div className="col-span-3">{v.views.toLocaleString()} views</div>
                  <div className="col-span-3 text-white/70">{v.users.toLocaleString()} users</div>
                  <div className="col-span-2 text-white/50">{v.conversions.toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="border-b border-white/10 bg-white/5 px-4 py-3 text-[0.65rem] uppercase tracking-[0.25em] text-white/60">
            Top pages
          </div>
          <div className="divide-y divide-white/10">
            {topPages.length === 0 ? (
              <div className="px-4 py-8 text-sm text-white/60">No snapshots yet.</div>
            ) : (
              topPages.map(([path, v]) => (
                <div key={path} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm text-white/80">
                  <div className="col-span-7 truncate text-white/90">{path}</div>
                  <div className="col-span-3 text-white/70">{v.views.toLocaleString()} views</div>
                  <div className="col-span-2 text-white/50">{v.users.toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

