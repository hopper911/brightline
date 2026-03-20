"use client";

import { useState, useEffect, useTransition } from "react";
import {
  searchArchiveAction,
  getArchiveFiltersAction,
  getRecentProjectsAction,
  getRepeatClientsAction,
  getProjectTimelineAction,
  getProjectDraftsAction,
  getProjectApprovalsAction,
  getProjectsByLocationAction,
} from "./actions";
import { Panel } from "@/components/studio/Panel";
import { EmptyState } from "@/components/studio/EmptyState";
import type { ArchiveSearchParams } from "./actions";

type ArchiveProject = {
  id: string;
  name: string;
  client: string | null;
  type: string | null;
  location: string | null;
  year: string | null;
  status: string | null;
  notes: string | null;
  folderPath: string | null;
  deliveryState: string | null;
  contentState: string | null;
  shootDate: string | null;
};

export function ArchiveRoom() {
  const [filters, setFilters] = useState<{ clients: string[]; types: string[]; locations: string[]; years: string[] }>({
    clients: [],
    types: [],
    locations: [],
    years: [],
  });
  const [params, setParams] = useState<ArchiveSearchParams>({});
  const [results, setResults] = useState<ArchiveProject[]>([]);
  const [recent, setRecent] = useState<ArchiveProject[]>([]);
  const [repeatClients, setRepeatClients] = useState<{ client: string; count: number }[]>([]);
  const [selected, setSelected] = useState<ArchiveProject | null>(null);
  const [timeline, setTimeline] = useState<{ room: string; type: string; summary: string; createdAt: string }[]>([]);
  const [drafts, setDrafts] = useState<{ type: string; room: string; content: string; createdAt: string }[]>([]);
  const [approvals, setApprovals] = useState<{ actionType: string; room: string; status: string; createdAt: string }[]>([]);
  const [sameLocation, setSameLocation] = useState<ArchiveProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getArchiveFiltersAction().then(setFilters);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      const [r, rec, rep] = await Promise.all([
        searchArchiveAction(params),
        getRecentProjectsAction(8),
        getRepeatClientsAction(),
      ]);
      if (cancelled) return;
      setResults(r as ArchiveProject[]);
      setRecent(rec as ArchiveProject[]);
      setRepeatClients(rep);
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [params.q, params.client, params.type, params.location, params.year]);

  useEffect(() => {
    if (!selected) {
      setTimeline([]);
      setDrafts([]);
      setApprovals([]);
      setSameLocation([]);
      return;
    }
    let cancelled = false;
    const loc = selected.location;
    void Promise.all([
      getProjectTimelineAction(selected.id),
      getProjectDraftsAction(selected.id),
      getProjectApprovalsAction(selected.id),
      loc ? getProjectsByLocationAction(loc) : Promise.resolve([]),
    ]).then(([evts, drfts, apprs, sameLoc]) => {
      if (cancelled) return;
      setTimeline(evts);
      setDrafts(drfts);
      setApprovals(apprs);
      setSameLocation((sameLoc as ArchiveProject[]).filter((p) => p.id !== selected.id));
    });
    return () => { cancelled = true; };
  }, [selected?.id]);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const q = (form.elements.namedItem("q") as HTMLInputElement)?.value?.trim();
    startTransition(() => {
      setParams((p) => ({ ...p, q: q || undefined }));
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="relative">
        <input
          name="q"
          type="search"
          placeholder="Search projects, clients, notes…"
          defaultValue={params.q}
          className="w-full rounded-studio-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-5 pr-12 text-sm text-white/95 placeholder-white/40 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent-border/50 transition-colors"
          aria-label="Search archive"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium uppercase tracking-wider text-accent hover:text-accent-muted"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <select
          value={params.client ?? ""}
          onChange={(e) => setParams((p) => ({ ...p, client: e.target.value || undefined }))}
          className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white/90"
        >
          <option value="">All clients</option>
          {filters.clients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={params.type ?? ""}
          onChange={(e) => setParams((p) => ({ ...p, type: e.target.value || undefined }))}
          className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white/90"
        >
          <option value="">All types</option>
          {filters.types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={params.location ?? ""}
          onChange={(e) => setParams((p) => ({ ...p, location: e.target.value || undefined }))}
          className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white/90"
        >
          <option value="">All locations</option>
          {filters.locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={params.year ?? ""}
          onChange={(e) => setParams((p) => ({ ...p, year: e.target.value || undefined }))}
          className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white/90"
        >
          <option value="">All years</option>
          {filters.years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {recent.length > 0 && !params.q && !params.client && !params.type && !params.location && !params.year && (
            <Panel padding="base">
              <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                Recent projects
              </p>
              <ul className="mt-3 space-y-1">
                {recent.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className={`w-full rounded-studio-base px-3 py-2 text-left text-sm transition-colors ${
                        selected?.id === p.id ? "bg-accent/10 text-white/95" : "text-white/75 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-2 text-white/45">· {p.client ?? "—"} {p.year ? `· ${p.year}` : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {repeatClients.length > 0 && !params.q && (
            <Panel padding="base">
              <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                Repeat clients
              </p>
              <ul className="mt-3 space-y-1">
                {repeatClients.slice(0, 6).map((r) => (
                  <li key={r.client}>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, client: r.client }))}
                      className="w-full rounded-studio-base px-3 py-2 text-left text-sm text-white/75 hover:bg-white/[0.05]"
                    >
                      <span>{r.client}</span>
                      <span className="ml-2 text-white/45">({r.count} projects)</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel padding="base">
            <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
              {params.q || params.client || params.type || params.location || params.year ? "Search results" : "All projects"}
            </p>
            {loading || isPending ? (
              <p className="mt-4 text-sm text-white/45">Loading…</p>
            ) : results.length === 0 ? (
              <EmptyState
                title="No projects found"
                description="Try adjusting your search or filters."
                className="mt-4"
              />
            ) : (
              <ul className="mt-3 space-y-1">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className={`w-full rounded-studio-base px-3 py-2 text-left text-sm transition-colors ${
                        selected?.id === p.id ? "bg-accent/10 text-white/95" : "text-white/75 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-2 text-white/45">
                        · {p.client ?? "—"} · {p.type ?? "—"} {p.year ? `· ${p.year}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel padding="base" className="lg:sticky lg:top-6">
          {!selected ? (
            <EmptyState
              title="Select a project"
              description="Click a project to view its history, drafts, and approvals."
            />
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-lg font-medium text-white/95">{selected.name}</h2>
                <p className="text-sm text-white/55">
                  {selected.client ?? "—"} · {selected.type ?? "—"} {selected.year ? `· ${selected.year}` : ""}
                </p>
                {selected.location && (
                  <p className="mt-1 text-xs text-white/45">Location: {selected.location}</p>
                )}
                {selected.folderPath && (
                  <p className="mt-1 font-mono text-xs text-white/45 truncate" title={selected.folderPath}>
                    {selected.folderPath}
                  </p>
                )}
              </div>

              {selected.notes && (
                <div>
                  <p className="font-display text-[10px] font-medium uppercase tracking-wider text-white/45">Notes</p>
                  <p className="mt-1 text-sm text-white/75 line-clamp-4">{selected.notes}</p>
                </div>
              )}

              {timeline.length > 0 && (
                <div>
                  <p className="font-display text-[10px] font-medium uppercase tracking-wider text-white/45">Timeline</p>
                  <ul className="mt-2 space-y-1.5">
                    {timeline.slice(0, 8).map((e, i) => (
                      <li key={i} className="flex gap-2 text-xs">
                        <span className="shrink-0 text-white/45">
                          {new Date(e.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        <span className="text-white/35">·</span>
                        <span className="text-white/70">{e.room}</span>
                        <span className="text-white/35">·</span>
                        <span className="text-white/90">{e.summary}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {drafts.length > 0 && (
                <div>
                  <p className="font-display text-[10px] font-medium uppercase tracking-wider text-white/45">Drafts</p>
                  <ul className="mt-2 space-y-1 text-xs text-white/70">
                    {drafts.map((d) => (
                      <li key={d.createdAt + d.type}>
                        {d.type} · {d.room} · {new Date(d.createdAt).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sameLocation.length > 0 && (
                <div>
                  <p className="font-display text-[10px] font-medium uppercase tracking-wider text-white/45">Same location</p>
                  <ul className="mt-2 space-y-1">
                    {sameLocation.slice(0, 4).map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(p)}
                          className="text-xs text-white/70 hover:text-white/90"
                        >
                          {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {approvals.length > 0 && (
                <div>
                  <p className="font-display text-[10px] font-medium uppercase tracking-wider text-white/45">Approvals</p>
                  <ul className="mt-2 space-y-1 text-xs text-white/70">
                    {approvals.map((a) => (
                      <li key={a.createdAt + a.actionType}>
                        {a.actionType} · {a.room} · {a.status} · {new Date(a.createdAt).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="border-t border-white/[0.06] pt-4 text-[10px] text-white/40">
                Archive is read-only. No edits or deletions from this view.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
