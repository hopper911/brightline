import Link from "next/link";
import type { StudioProjectDashboardRow } from "@/lib/studio/projects/types";

type Props = {
  items: StudioProjectDashboardRow[];
  emptyMessage: string;
};

function lifecycleBadgeClass(lifecycle: string): string {
  if (lifecycle === "PUBLISHED") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (lifecycle === "IN_REVIEW") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  if (lifecycle === "APPROVED") return "border-sky-300/30 bg-sky-300/10 text-sky-100";
  if (lifecycle === "MEDIA_READY" || lifecycle === "CONTENT_READY") {
    return "border-violet-300/30 bg-violet-300/10 text-violet-100";
  }
  return "border-white/15 bg-white/5 text-white/70";
}

export function StudioProjectsTable({ items, emptyMessage }: Props) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-10 text-sm text-white/60">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
          <tr>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Tenant</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Complete</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-white/80">
          {items.map((row) => (
            <tr key={`${row.tenant}:${row.kind}:${row.id}`} className="bg-white/[0.02]">
              <td className="px-4 py-3">
                <p className="font-medium text-white">{row.title}</p>
                <p className="mt-0.5 text-xs text-white/45">{row.slug}</p>
              </td>
              <td className="px-4 py-3 text-white/60">{row.tenant}</td>
              <td className="px-4 py-3 text-white/60">{row.typeLabel}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${lifecycleBadgeClass(row.lifecycle)}`}
                >
                  {row.lifecycleLabel}
                </span>
                {row.published ? (
                  <span className="ml-2 text-xs text-emerald-200/80">Live</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <p className="tabular-nums text-white">{row.completenessScore}%</p>
                {row.missing.length > 0 ? (
                  <p className="mt-1 max-w-[14rem] text-xs text-white/45">
                    Missing: {row.missing.slice(0, 3).join(", ")}
                    {row.missing.length > 3 ? ` +${row.missing.length - 3}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-emerald-200/70">Ready</p>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-white/50">
                {new Date(row.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={row.editHref}
                  className="rounded border border-white/15 px-2 py-1 text-xs text-white/70 hover:text-white"
                >
                  Continue editing
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
