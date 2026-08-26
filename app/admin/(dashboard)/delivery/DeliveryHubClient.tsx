"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DeliveryImageGuide from "@/components/admin/DeliveryImageGuide";
import { PACKAGE_STATUSES } from "@/lib/delivery/package-status";

type Row = {
  id: string;
  title: string;
  status: string;
  accessToken: string;
  publicSlug?: string | null;
  deliveryDate?: string | null;
  updatedAt: string;
  project: { id: string; title: string; slug: string; section: string; client?: string | null };
  client?: { id: string; companyName: string; email?: string | null } | null;
  _count?: { items: number };
};

function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, credentials: "include" });
}

export default function DeliveryHubClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [deliveryDateFrom, setDeliveryDateFrom] = useState("");
  const [deliveryDateTo, setDeliveryDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const limit = 30;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const qs = new URLSearchParams();
    qs.set("limit", String(limit));
    qs.set("offset", String(offset));
    if (status.trim()) qs.set("status", status.trim());
    if (projectId.trim()) qs.set("projectId", projectId.trim());
    if (clientId.trim()) qs.set("clientId", clientId.trim());
    if (deliveryDateFrom.trim()) qs.set("deliveryDateFrom", deliveryDateFrom.trim());
    if (deliveryDateTo.trim()) qs.set("deliveryDateTo", deliveryDateTo.trim());
    const res = await adminFetch(`/api/admin/delivery-packages?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setErr(data.error ?? "Could not load packages.");
      setRows([]);
      setTotal(0);
    } else {
      setRows(data.packages ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [offset, status, projectId, clientId, deliveryDateFrom, deliveryDateTo]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-white/50">Filters</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={status}
            onChange={(e) => {
              setOffset(0);
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            {PACKAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="min-w-[200px] rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35"
            placeholder="Filter: work project id"
            value={projectId}
            onChange={(e) => {
              setOffset(0);
              setProjectId(e.target.value);
            }}
          />
          <input
            className="min-w-[200px] rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35"
            placeholder="Filter: studio client id"
            value={clientId}
            onChange={(e) => {
              setOffset(0);
              setClientId(e.target.value);
            }}
          />
          <input
            type="date"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={deliveryDateFrom}
            onChange={(e) => {
              setOffset(0);
              setDeliveryDateFrom(e.target.value);
            }}
            aria-label="Delivery date from"
          />
          <input
            type="date"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={deliveryDateTo}
            onChange={(e) => {
              setOffset(0);
              setDeliveryDateTo(e.target.value);
            }}
            aria-label="Delivery date to"
          />
        </div>
        <p className="mt-3 text-xs text-white/45">
          Showing {rows.length} of {total}
          {loading ? " · loading…" : ""}
        </p>
        {err ? <p className="mt-2 text-sm text-rose-300">{err}</p> : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
                <th className="py-2 pr-4">Package</th>
                <th className="py-2 pr-4">Work</th>
                <th className="py-2 pr-4">Client</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Delivery date</th>
                <th className="py-2 pr-4">Items</th>
                <th className="py-2">Links</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.06]">
                  <td className="py-3 pr-4 align-top">
                    <p className="font-medium text-white/90">{r.title}</p>
                    <p className="mt-1 font-mono text-[11px] text-white/40">
                      {r.id.slice(0, 8)}…
                    </p>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <Link
                      href={`/admin/work/${r.project.id}`}
                      className="text-emerald-300 underline hover:text-emerald-200"
                    >
                      {r.project.title}
                    </Link>
                    {r.project.client ? (
                      <p className="mt-1 text-xs text-white/45">{r.project.client}</p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 align-top text-white/60">
                    {r.client?.companyName ?? "—"}
                  </td>
                  <td className="py-3 pr-4 align-top text-white/60">{r.status}</td>
                  <td className="py-3 pr-4 align-top text-white/60">
                    {r.deliveryDate
                      ? new Date(r.deliveryDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 align-top text-white/60">{r._count?.items ?? "—"}</td>
                  <td className="py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <a
                        className="text-emerald-300 underline hover:text-emerald-200"
                        href={`/package/${r.accessToken}`}
                      >
                        Client package
                      </a>
                      {r.publicSlug ? (
                        <a
                          className="text-xs text-white/50 underline hover:text-white/70"
                          href={`/delivery/${r.publicSlug}`}
                        >
                          /delivery/{r.publicSlug.slice(0, 12)}…
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !loading ? (
            <p className="py-8 text-center text-sm text-white/50">No delivery packages match.</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-40"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-40"
            disabled={loading || offset + rows.length >= total}
            onClick={() => setOffset((o) => o + limit)}
          >
            Next
          </button>
        </div>
      </section>

      <DeliveryImageGuide />
    </div>
  );
}
