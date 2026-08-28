"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type ProjectOption = { id: string; title: string; client: string; clientId: string | null };
type ClientOption = { id: string; companyName: string };

type ScheduleEventOption = {
  id: string;
  title: string;
  startsAt: string;
  studioProjectId: string | null;
};

type TaskStatus = "TODO" | "IN_PROGRESS" | "WAITING" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  assigneeNote: string | null;
  labels: string[];
  sortOrder: number;
  studioProjectId: string | null;
  studioClientId: string | null;
  parentTaskId: string | null;
  project: { id: string; title: string; slug: string } | null;
  client: { id: string; companyName: string } | null;
  scheduleEvent: { id: string; title: string; startsAt: string } | null;
};

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "WAITING", "DONE", "CANCELLED"];
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

type ViewMode = "list" | "kanban" | "timeline";

type Props = {
  projects: ProjectOption[];
  clients: ClientOption[];
};

async function reqJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || (data as { ok?: boolean }).ok === false) {
    throw new Error((data as { error?: string }).error ?? "Request failed.");
  }
  return data;
}

function weekKey(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return `${x.getUTCFullYear()}-W${String(Math.ceil(((x.getTime() - y.getTime()) / 86400000 + 1) / 7)).padStart(2, "0")}`;
}

export function TasksWorkspace({ projects, clients }: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [showCreate, setShowCreate] = useState(false);
  const [draftProjectId, setDraftProjectId] = useState("");

  const loadScheduleEvents = useCallback(async () => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 180);
    const qs = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const res = await fetch(`/api/studio/schedule?${qs}`, { credentials: "include" });
    const data = await reqJson<{ events: ScheduleEventOption[] }>(res);
    setScheduleEvents(
      (data.events ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        startsAt: e.startsAt,
        studioProjectId: e.studioProjectId ?? null,
      }))
    );
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/studio/tasks", { credentials: "include" });
    const data = await reqJson<{ tasks: TaskRow[] }>(res);
    setTasks(data.tasks);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await Promise.all([load(), loadScheduleEvents()]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, loadScheduleEvents]);

  const eventsForDraftProject = useMemo(() => {
    if (!draftProjectId) return [];
    return scheduleEvents.filter((e) => e.studioProjectId === draftProjectId);
  }, [draftProjectId, scheduleEvents]);

  function eventsForTaskProject(projectId: string | null) {
    if (!projectId) return [];
    return scheduleEvents.filter((e) => e.studioProjectId === projectId);
  }

  async function createTask(form: HTMLFormElement) {
    const fd = new FormData(form);
    const labelsRaw = fd.get("labels")?.toString().trim() ?? "";
    const labels = labelsRaw ? labelsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const res = await fetch("/api/studio/tasks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title")?.toString().trim(),
        description: fd.get("description")?.toString().trim() || null,
        status: fd.get("status")?.toString() || "TODO",
        priority: fd.get("priority")?.toString() || "MEDIUM",
        dueAt: fd.get("dueAt")?.toString() || null,
        assigneeNote: fd.get("assigneeNote")?.toString().trim() || null,
        studioProjectId: fd.get("studioProjectId")?.toString() || null,
        studioClientId: fd.get("studioClientId")?.toString() || null,
        studioScheduleEventId: fd.get("studioScheduleEventId")?.toString() || null,
        labels,
      }),
    });
    await reqJson(res);
    form.reset();
    setDraftProjectId("");
    setShowCreate(false);
    await load();
  }

  async function patchTask(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/studio/tasks/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await reqJson(res);
    await load();
  }

  async function removeTask(id: string) {
    if (!confirm("Delete this task?")) return;
    const res = await fetch(`/api/studio/tasks/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await reqJson(res);
    await load();
  }

  const byStatus = useMemo(() => {
    const m = new Map<TaskStatus, TaskRow[]>();
    for (const s of STATUSES) m.set(s, []);
    for (const t of tasks) {
      m.get(t.status)?.push(t);
    }
    return m;
  }, [tasks]);

  const timelineGroups = useMemo(() => {
    const groups = new Map<string, TaskRow[]>();
    const unscheduled: TaskRow[] = [];
    for (const t of tasks) {
      if (!t.dueAt) {
        unscheduled.push(t);
        continue;
      }
      const w = weekKey(new Date(t.dueAt));
      if (!groups.has(w)) groups.set(w, []);
      groups.get(w)!.push(t);
    }
    const keys = [...groups.keys()].sort();
    return { keys, groups, unscheduled };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {(["list", "kanban", "timeline"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
              view === v ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
          >
            {v}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="btn btn-primary text-xs"
        >
          {showCreate ? "Close" : "New task"}
        </button>
        <button type="button" onClick={() => void load()} className="btn btn-ghost text-xs">
          Refresh
        </button>
      </div>

      <AnimatePresence>
        {showCreate ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <form
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                void createTask(e.currentTarget);
              }}
            >
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">New task</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-white/70">
                Title
                <input name="title" required className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70">
                Due
                <input name="dueAt" type="date" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70 md:col-span-2">
                Description
                <textarea name="description" rows={2} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70">
                Status
                <select name="status" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Priority
                <select name="priority" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Project
                <select
                  name="studioProjectId"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  value={draftProjectId}
                  onChange={(e) => setDraftProjectId(e.target.value)}
                >
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Linked calendar event
                <select
                  name="studioScheduleEventId"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  disabled={!draftProjectId}
                >
                  <option value="">—</option>
                  {eventsForDraftProject.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} · {new Date(e.startsAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Client
                <select name="studioClientId" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70 md:col-span-2">
                Labels (comma-separated)
                <input name="labels" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70 md:col-span-2">
                Assignee note
                <input name="assigneeNote" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
            </div>
            <button type="submit" className="btn btn-primary mt-4 text-xs">
              Create
            </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {loading ? (
        <p className="text-sm text-white/55">Loading tasks…</p>
      ) : view === "list" ? (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[860px] text-left text-sm text-white/80">
            <thead className="border-b border-white/10 text-xs uppercase tracking-widest text-white/45">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">{t.title}</td>
                  <td className="px-4 py-3 text-white/55">
                    {t.project ? (
                      <Link href={`/admin/projects/${t.project.id}/edit`} className="hover:text-white/90">
                        {t.project.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/55">
                    {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      onChange={(e) =>
                        void patchTask(t.id, { status: e.target.value as TaskStatus })
                      }
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.priority}
                      onChange={(e) =>
                        void patchTask(t.id, { priority: e.target.value as TaskPriority })
                      }
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.scheduleEvent?.id ?? ""}
                      onChange={(e) =>
                        void patchTask(t.id, {
                          studioScheduleEventId: e.target.value || null,
                        })
                      }
                      className="max-w-[200px] rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                    >
                      <option value="">—</option>
                      {eventsForTaskProject(t.studioProjectId).map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-xs text-red-300/90 hover:text-red-200"
                      onClick={() => void removeTask(t.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "kanban" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {STATUSES.map((s) => (
            <div key={s} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-widest text-white/45">{s.replace("_", " ")}</p>
              <div className="mt-3 space-y-2">
                <AnimatePresence initial={false}>
                  {(byStatus.get(s) ?? []).map((t) => (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                    >
                      <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-sm font-medium text-white">{t.title}</p>
                      {t.project ? <p className="mt-1 text-xs text-white/45">{t.project.title}</p> : null}
                      {t.scheduleEvent ? (
                        <p className="mt-1 text-[10px] text-amber-200/70">
                          Event · {t.scheduleEvent.title}
                        </p>
                      ) : null}
                      {t.dueAt ? (
                        <p className="mt-1 text-xs text-white/40">{new Date(t.dueAt).toLocaleDateString()}</p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-white/35">{t.priority}</p>
                      <select
                        value={t.status}
                        onChange={(e) =>
                          void patchTask(t.id, { status: e.target.value as TaskStatus })
                        }
                        className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {timelineGroups.unscheduled.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-widest text-white/45">Unscheduled</p>
              <ul className="mt-2 space-y-2">
                {timelineGroups.unscheduled.map((t) => (
                  <li key={t.id} className="text-sm text-white/80">
                    {t.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {timelineGroups.keys.map((wk) => (
            <div key={wk} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-widest text-white/45">Week {wk}</p>
              <ul className="mt-2 space-y-2">
                {(timelineGroups.groups.get(wk) ?? []).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-white">{t.title}</span>
                    <span className="text-white/45">
                      {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
