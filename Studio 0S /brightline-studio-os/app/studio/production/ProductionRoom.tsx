"use client";

import { useState, useEffect } from "react";
import {
  getProjectsList,
  getProjectDetail,
  createProjectAction,
  updateProjectAction,
  getProjectTimeline,
  getHandoffs,
  acceptHandoffAction,
  dismissHandoffAction,
  generateBrief,
  generateShotListAction,
  generateChecklistAction,
} from "./actions";
import { Panel } from "@/components/studio/Panel";
import { EmptyState } from "@/components/studio/EmptyState";
import type { Project } from "@/lib/projects/store";
import { PROJECT_STATUSES } from "@/lib/projects/constants";

export function ProductionRoom() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [timeline, setTimeline] = useState<{ id: string; room: string; agent: string; type: string; summary: string; createdAt: string }[]>([]);
  const [handoffs, setHandoffs] = useState<{ id: string; fromRoom: string; payloadJson: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  async function loadProjects() {
    setProjects(await getProjectsList());
  }

  async function loadHandoffs() {
    const h = await getHandoffs();
    setHandoffs(h);
  }

  async function loadProject(id: string | null) {
    if (!id) {
      setProject(null);
      setTimeline([]);
      return;
    }
    const p = await getProjectDetail(id);
    setProject(p);
    if (p) setTimeline(await getProjectTimeline(id));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadProjects();
      await loadHandoffs();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    loadProject(selectedId);
  }, [selectedId]);

  async function handleCreate(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name) return;
    setPending("create");
    try {
      const res = await createProjectAction({
        name,
        client: (formData.get("client") as string) || undefined,
        type: (formData.get("type") as string) || undefined,
        location: (formData.get("location") as string) || undefined,
        shootDate: (formData.get("shootDate") as string) || undefined,
        status: "lead",
      });
      if ("id" in res) {
        setShowCreate(false);
        await loadProjects();
        setSelectedId(res.id);
      }
    } finally {
      setPending(null);
    }
  }

  async function handleAcceptHandoff(id: string, payload: { projectName: string; client: string; type: string; summary: string }) {
    const res = await createProjectAction({
      name: payload.projectName,
      client: payload.client,
      type: payload.type,
      notes: payload.summary,
      status: "lead",
    });
    if ("id" in res) {
      await acceptHandoffAction(id);
      await loadHandoffs();
      await loadProjects();
      setSelectedId(res.id);
    }
  }

  async function handleUpdate(field: string, value: string | null) {
    if (!selectedId) return;
    await updateProjectAction(selectedId, { [field]: value });
    loadProject(selectedId);
  }

  async function handleGenerateBrief() {
    if (!selectedId || !project) return;
    setPending("brief");
    try {
      await generateBrief(selectedId);
      await loadProject(selectedId);
    } finally {
      setPending(null);
    }
  }

  async function handleGenerateShotList() {
    if (!selectedId) return;
    setPending("shotList");
    try {
      await generateShotListAction(selectedId);
      await loadProject(selectedId);
    } finally {
      setPending(null);
    }
  }

  async function handleGenerateChecklist(kind: "shoot" | "gear") {
    if (!selectedId) return;
    setPending(kind === "shoot" ? "shootChecklist" : "gearChecklist");
    try {
      await generateChecklistAction(selectedId, kind);
      await loadProject(selectedId);
    } finally {
      setPending(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse rounded-studio-xl border border-white/[0.05] bg-white/[0.02] p-8">
        <p className="text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {handoffs.length > 0 && (
        <Panel padding="base" className="border-accent-border/50 bg-accent-glow/30">
          <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-accent">
            Handoffs from Reception
          </p>
          <ul className="mt-3 space-y-2">
            {handoffs.map((h) => {
              const p = JSON.parse(h.payloadJson) as { projectName: string; client: string; type: string; summary: string };
              return (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-studio-base border border-white/[0.06] bg-white/[0.02] p-3">
                  <div>
                    <p className="font-medium text-white/90">{p.projectName}</p>
                    <p className="text-xs text-white/55">{p.client} · {p.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAcceptHandoff(h.id, p)}
                      className="rounded-studio-base border border-accent-border bg-accent/10 px-3 py-1.5 text-xs font-medium text-white/95 hover:bg-accent/15"
                    >
                      Create project
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await dismissHandoffAction(h.id);
                        loadHandoffs();
                      }}
                      className="rounded-studio-base border border-white/[0.08] px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.05]"
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Panel padding="base">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
              Projects
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              className="text-xs font-medium text-accent hover:text-accent-muted"
            >
              {showCreate ? "Cancel" : "+ New"}
            </button>
          </div>
          {showCreate && (
            <form action={handleCreate} className="mt-4 space-y-2">
              <input
                name="name"
                placeholder="Project name"
                required
                className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95 placeholder-white/40"
              />
              <input
                name="client"
                placeholder="Client"
                className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95 placeholder-white/40"
              />
              <input
                name="type"
                placeholder="Type (brand, portrait, etc.)"
                className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95 placeholder-white/40"
              />
              <input
                name="location"
                placeholder="Location"
                className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95 placeholder-white/40"
              />
              <input
                name="shootDate"
                type="date"
                placeholder="Shoot date"
                className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95"
              />
              <button
                type="submit"
                disabled={!!pending}
                className="w-full rounded-studio-base border border-accent-border bg-accent/10 py-2 text-sm font-medium text-white/95 disabled:opacity-50"
              >
                {pending === "create" ? "Creating…" : "Create"}
              </button>
            </form>
          )}
          <ul className="mt-4 space-y-1">
            {projects.length === 0 && !showCreate ? (
              <li className="py-4 text-center text-sm text-white/45">No projects</li>
            ) : (
              projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-studio-base px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === p.id ? "bg-accent/10 text-white/95" : "text-white/75 hover:bg-white/[0.05]"
                    }`}
                  >
                    {p.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <div className="space-y-6">
          {!selectedId ? (
            <EmptyState
              title="Select a project"
              description="Choose a project from the list or create a new one."
            />
          ) : !project ? (
            <p className="text-sm text-white/50">Loading project…</p>
          ) : (
            <>
              <Panel padding="base" className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-medium text-white/95">{project.name}</h2>
                    <p className="text-sm text-white/55">{project.client ?? "—"} · {project.type ?? "—"}</p>
                  </div>
                  <select
                    value={project.status ?? "lead"}
                    onChange={(e) => handleUpdate("status", e.target.value)}
                    className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white/95"
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-white/45">Location</label>
                    <input
                      value={project.location ?? ""}
                      onChange={(e) => handleUpdate("location", e.target.value || null)}
                      onBlur={(e) => handleUpdate("location", e.target.value.trim() || null)}
                      className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-white/45">Shoot date</label>
                    <input
                      type="date"
                      value={project.shootDate ?? ""}
                      onChange={(e) => handleUpdate("shootDate", e.target.value || null)}
                      className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateBrief}
                    disabled={!!pending}
                    className="rounded-studio-base border border-accent-border bg-accent/10 px-3 py-1.5 text-xs font-medium text-white/95 hover:bg-accent/15 disabled:opacity-50"
                  >
                    {pending === "brief" ? "…" : "Generate brief"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateShotList()}
                    disabled={!!pending}
                    className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    {pending === "shotList" ? "…" : "Shot list"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateChecklist("shoot")}
                    disabled={!!pending}
                    className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    {pending === "shootChecklist" ? "…" : "Shoot checklist"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateChecklist("gear")}
                    disabled={!!pending}
                    className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    {pending === "gearChecklist" ? "…" : "Gear checklist"}
                  </button>
                </div>
              </Panel>

              <Panel padding="base">
                <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                  Notes
                </p>
                <textarea
                  value={project.notes ?? ""}
                  onChange={(e) => setProject({ ...project, notes: e.target.value })}
                  onBlur={(e) => handleUpdate("notes", e.target.value.trim() || null)}
                  rows={4}
                  className="mt-2 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95 placeholder-white/40"
                  placeholder="Project notes…"
                />
              </Panel>

              <Panel padding="base">
                <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                  Checklist
                </p>
                <textarea
                  value={project.checklist ?? ""}
                  onChange={(e) => setProject({ ...project, checklist: e.target.value })}
                  onBlur={(e) => handleUpdate("checklist", e.target.value.trim() || null)}
                  rows={6}
                  className="mt-2 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-white/95 placeholder-white/40"
                  placeholder="[ ] Item 1&#10;[ ] Item 2"
                />
              </Panel>

              {timeline.length > 0 && (
                <Panel padding="base">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                    Timeline
                  </p>
                  <ul className="mt-3 space-y-2">
                    {timeline.map((evt) => (
                      <li key={evt.id} className="flex items-start gap-2 text-sm">
                        <span className="text-[10px] uppercase tracking-wider text-white/45">
                          {new Date(evt.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-white/35">·</span>
                        <span className="text-white/70">{evt.room}</span>
                        <span className="text-white/35">·</span>
                        <span className="text-white/90">{evt.summary}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
