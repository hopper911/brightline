import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Automations · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

function parseTake(v: string | undefined): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.min(200, Math.max(10, Math.trunc(n)));
}

export default async function AdminAutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; workflow?: string; take?: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim();
  const workflow = (sp.workflow ?? "").trim();
  const take = parseTake(sp.take);

  const where =
    q || status || workflow
      ? {
          AND: [
            ...(status ? [{ status }] : []),
            ...(workflow ? [{ workflowName: { contains: workflow, mode: "insensitive" as const } }] : []),
            ...(q
              ? [
                  {
                    OR: [
                      { workflowName: { contains: q, mode: "insensitive" as const } },
                      { entityType: { contains: q, mode: "insensitive" as const } },
                      { entityId: { contains: q, mode: "insensitive" as const } },
                      { message: { contains: q, mode: "insensitive" as const } },
                    ],
                  },
                ]
              : []),
          ],
        }
      : undefined;

  const runs = await prisma.automationRun.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take,
  });

  const uniqueStatuses = Array.from(new Set(runs.map((r) => r.status))).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        Studio OS
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-white">Automations</h1>
          <p className="mt-2 text-sm text-white/70">
            Recent automation runs.
          </p>
        </div>
      </div>

      <form className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.25em] text-white/50">
              Search
            </span>
            <input
              name="q"
              defaultValue={q}
              placeholder="workflow, entity id, message…"
              className="mt-1 w-72 max-w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.25em] text-white/50">
              Status
            </span>
            <select
              name="status"
              defaultValue={status}
              className="mt-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
            >
              <option value="">Any</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.25em] text-white/50">
              Workflow contains
            </span>
            <input
              name="workflow"
              defaultValue={workflow}
              className="mt-1 w-64 max-w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-[0.65rem] uppercase tracking-[0.25em] text-white/50">
              Take
            </span>
            <input
              name="take"
              defaultValue={String(take)}
              type="number"
              min={10}
              max={200}
              className="mt-1 w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" type="submit">
            Filter
          </button>
          <Link href="/admin/automations" className="btn btn-ghost">
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-[0.65rem] uppercase tracking-[0.25em] text-white/60">
          <div className="col-span-4">Workflow</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Entity</div>
          <div className="col-span-3">Started</div>
        </div>
        {runs.length ? (
          <div className="divide-y divide-white/10">
            {runs.map((r) => (
              <Link
                key={r.id}
                href={`/admin/automations/${r.id}`}
                className="grid grid-cols-12 gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5"
              >
                <div className="col-span-4 truncate">{r.workflowName}</div>
                <div className="col-span-2">
                  <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-white/70">
                    {r.status}
                  </span>
                </div>
                <div className="col-span-3 truncate text-white/60">
                  {r.entityType ? `${r.entityType}${r.entityId ? ` · ${r.entityId}` : ""}` : "—"}
                </div>
                <div className="col-span-3 text-white/60">
                  {r.startedAt.toISOString()}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-sm text-white/60">
            No automation runs yet.
          </div>
        )}
      </div>
    </div>
  );
}

