"use client";

import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const SCHEDULE_KINDS = [
  "SHOOT",
  "DEADLINE",
  "REMINDER",
  "TRAVEL",
  "MEETING",
  "REVIEW",
  "EDITING",
  "INTERNAL",
  "DELIVERY",
  "OTHER",
] as const;

type ProjectOption = { id: string; title: string };
export type ProjectDateHint = {
  projectId: string;
  title: string;
  slug: string;
  date: string;
  kind: "shoot" | "delivery";
};

type ClientOption = { id: string; companyName: string };

type ScheduleEventRow = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  kind: string;
  location: string | null;
  studioProjectId: string | null;
  studioClientId: string | null;
  remindAt: string | null;
  calendarStatus: string | null;
  colorToken: string | null;
  googleCalendarEventId: string | null;
  project: { id: string; title: string; slug: string } | null;
  client: { id: string; companyName: string } | null;
};

type Tab = "agenda" | "week" | "month" | "timeline";

type Props = {
  initialYear: number;
  initialMonth: number;
  projectHints: ProjectDateHint[];
  projects: ProjectOption[];
  clients: ClientOption[];
};

async function reqJson(res: Response) {
  const data = (await res.json()) as { ok?: boolean; error?: string; events?: ScheduleEventRow[] };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1, 0, 0, 0, 0);
}

function endOfMonth(y: number, m: number) {
  return new Date(y, m + 1, 0, 23, 59, 59, 999);
}

function weekKeyUTC(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return `${x.getUTCFullYear()}-W${String(Math.ceil(((x.getTime() - y0.getTime()) / 86400000 + 1) / 7)).padStart(2, "0")}`;
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function CalendarWorkspace({ initialYear, initialMonth, projectHints, projects, clients }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("agenda");
  const [events, setEvents] = useState<ScheduleEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));

  const y = initialYear;
  const mo = initialMonth;

  const rangeFrom = useMemo(() => startOfMonth(y, mo), [y, mo]);
  const rangeTo = useMemo(() => {
    const e = endOfMonth(y, mo);
    e.setMonth(e.getMonth() + 2);
    return e;
  }, [y, mo]);

  const load = useCallback(async () => {
    setError(null);
    let from = startOfMonth(y, mo);
    let to = endOfMonth(y, mo);
    to.setMonth(to.getMonth() + 2);

    if (tab === "week") {
      const w0 = startOfWeekMonday(weekStart);
      const w1 = addDays(w0, 7);
      w1.setHours(23, 59, 59, 999);
      if (w0.getTime() < from.getTime()) from = w0;
      if (w1.getTime() > to.getTime()) to = w1;
    }

    const qs = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const res = await fetch(`/api/studio/schedule?${qs}`, { credentials: "include" });
    const data = await reqJson(res);
    setEvents(data.events ?? []);
  }, [y, mo, tab, weekStart]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function createEvent(form: HTMLFormElement) {
    const fd = new FormData(form);
    const startsAt = fd.get("startsAt")?.toString();
    if (!startsAt) return;
    const remindRaw = fd.get("remindAt")?.toString();
    const res = await fetch("/api/studio/schedule", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title")?.toString().trim(),
        description: fd.get("description")?.toString().trim() || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: fd.get("endsAt")?.toString()
          ? new Date(fd.get("endsAt")!.toString()).toISOString()
          : null,
        allDay: fd.get("allDay") === "on",
        kind: fd.get("kind")?.toString() || "OTHER",
        location: fd.get("location")?.toString().trim() || null,
        studioProjectId: fd.get("studioProjectId")?.toString() || null,
        studioClientId: fd.get("studioClientId")?.toString() || null,
        remindAt:
          remindRaw && remindRaw.length > 0 ? new Date(remindRaw).toISOString() : null,
        calendarStatus: fd.get("calendarStatus")?.toString().trim() || null,
        colorToken: fd.get("colorToken")?.toString().trim() || null,
      }),
    });
    await reqJson(res);
    form.reset();
    setShowCreate(false);
    await load();
  }

  async function removeEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/studio/schedule/${id}`, { method: "DELETE", credentials: "include" });
    await reqJson(res);
    await load();
  }

  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [events]
  );

  const agendaDays = useMemo(() => {
    const map = new Map<string, ScheduleEventRow[]>();
    for (const e of sorted) {
      const d = new Date(e.startsAt);
      const key = d.toLocaleDateString("en-CA");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const keys = [...map.keys()].sort();
    return keys.map((dayKey) => ({ dayKey, events: map.get(dayKey)! }));
  }, [sorted]);

  const weekDays = useMemo(() => {
    const w0 = startOfWeekMonday(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(w0, i));
  }, [weekStart]);

  function eventsOnDay(day: Date) {
    return sorted.filter((e) => sameLocalDay(new Date(e.startsAt), day));
  }

  const hintsInRange = useMemo(() => {
    return projectHints.filter((h) => {
      const t = new Date(h.date).getTime();
      return t >= rangeFrom.getTime() && t <= rangeTo.getTime();
    });
  }, [projectHints, rangeFrom, rangeTo]);

  const monthDays = useMemo(() => {
    const first = startOfMonth(y, mo);
    const last = endOfMonth(y, mo);
    const days: Date[] = [];
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [y, mo]);

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const key = new Date(e.startsAt).toDateString();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const timelineWeeks = useMemo(() => {
    const groups = new Map<string, ScheduleEventRow[]>();
    for (const e of sorted) {
      const w = weekKeyUTC(new Date(e.startsAt));
      if (!groups.has(w)) groups.set(w, []);
      groups.get(w)!.push(e);
    }
    const keys = [...groups.keys()].sort();
    return { keys, groups };
  }, [sorted]);

  function prevMonth() {
    if (mo === 0) {
      router.push(`/studio/calendar?y=${y - 1}&m=12`);
    } else {
      router.push(`/studio/calendar?y=${y}&m=${mo}`);
    }
  }

  function nextMonth() {
    if (mo === 11) {
      router.push(`/studio/calendar?y=${y + 1}&m=1`);
    } else {
      router.push(`/studio/calendar?y=${y}&m=${mo + 2}`);
    }
  }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const leadBlank = startOfMonth(y, mo).getDay();

  function eventAccentStyle(e: ScheduleEventRow): CSSProperties | undefined {
    if (!e.colorToken?.trim()) return undefined;
    const c = e.colorToken.trim();
    return { borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: c };
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {(["agenda", "week", "month", "timeline"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
              tab === t ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
          >
            {t}
          </button>
        ))}
        <button type="button" className="btn btn-primary text-xs" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? "Close" : "New event"}
        </button>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => void load()}>
          Refresh
        </button>
        {tab === "month" ? (
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="btn btn-ghost text-xs" onClick={prevMonth}>
              Prev
            </button>
            <span className="text-sm text-white/70">
              {new Date(y, mo, 1).toLocaleString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button type="button" className="btn btn-ghost text-xs" onClick={nextMonth}>
              Next
            </button>
          </div>
        ) : null}
        {tab === "week" ? (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
            >
              Prev week
            </button>
            <span className="text-sm text-white/70">Week of {weekDays[0]!.toLocaleDateString()}</span>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
            >
              Next week
            </button>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {showCreate ? (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void createEvent(e.currentTarget);
            }}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Schedule event</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-white/70">
                Title
                <input name="title" required className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70">
                Kind
                <select
                  name="kind"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                >
                  {SCHEDULE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Starts
                <input name="startsAt" type="datetime-local" required className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70">
                Ends
                <input name="endsAt" type="datetime-local" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70 md:col-span-2">
                <input name="allDay" type="checkbox" className="rounded border-white/20" />
                All day
              </label>
              <label className="block text-sm text-white/70 md:col-span-2">
                Location
                <input name="location" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70 md:col-span-2">
                Description
                <textarea name="description" rows={2} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70 md:col-span-2">
                Project
                <select name="studioProjectId" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70 md:col-span-2">
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
              <label className="block text-sm text-white/70">
                Remind at
                <input name="remindAt" type="datetime-local" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70">
                Calendar status (free text)
                <input name="calendarStatus" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70 md:col-span-2">
                Color token (CSS color)
                <input name="colorToken" placeholder="#c9a227" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              </label>
            </div>
            <button type="submit" className="btn btn-primary mt-4 text-xs">
              Save
            </button>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {hintsInRange.length > 0 ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-emerald-200/70">Project dates (from CMS)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {hintsInRange.map((h) => (
              <Link
                key={`${h.projectId}-${h.kind}-${h.date}`}
                href={`/admin/projects/${h.projectId}/edit`}
                className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                {h.title} · {h.kind === "shoot" ? "Shoot" : "Delivery"} · {new Date(h.date).toLocaleDateString()}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/55">Loading schedule…</p>
      ) : tab === "agenda" ? (
        <div className="space-y-6">
          {agendaDays.length === 0 ? (
            <p className="text-sm text-white/55">No events in this window.</p>
          ) : (
            agendaDays.map(({ dayKey, events: dayEvents }) => (
              <div key={dayKey} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-widest text-white/45">
                  {new Date(dayKey + "T12:00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <ul className="mt-3 space-y-2">
                  {dayEvents.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 pl-3"
                      style={eventAccentStyle(e)}
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{e.title}</p>
                        <p className="text-xs text-white/45">
                          {new Date(e.startsAt).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          · {e.kind}
                          {e.project ? ` · ${e.project.title}` : ""}
                          {e.client ? ` · ${e.client.companyName}` : ""}
                          {e.calendarStatus ? ` · ${e.calendarStatus}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-red-300/90 hover:text-red-200"
                        onClick={() => void removeEvent(e.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ) : tab === "week" ? (
        <div className="grid gap-2 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayEvents = eventsOnDay(day);
            return (
              <div key={day.toISOString()} className="min-h-[160px] rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <p className="text-center text-[10px] uppercase tracking-widest text-white/40">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className="text-center text-sm text-white/80">{day.getDate()}</p>
                <ul className="mt-2 space-y-1.5">
                  {dayEvents.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white/85"
                      style={eventAccentStyle(e)}
                    >
                      <span className="block truncate font-medium">{e.title}</span>
                      <span className="text-white/45">
                        {new Date(e.startsAt).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : tab === "month" ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-white/40">
            {weekdayLabels.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadBlank }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[72px] rounded-lg bg-transparent" />
            ))}
            {monthDays.map((day) => {
              const key = day.toDateString();
              const n = countsByDay.get(key) ?? 0;
              return (
                <div
                  key={key}
                  className="min-h-[72px] rounded-lg border border-white/5 bg-black/20 p-1 text-left"
                >
                  <p className="text-xs text-white/50">{day.getDate()}</p>
                  {n > 0 ? (
                    <p className="mt-1 text-[10px] font-medium text-white/80">{n} evt</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {timelineWeeks.keys.length === 0 ? (
            <p className="text-sm text-white/55">No events in range.</p>
          ) : (
            timelineWeeks.keys.map((wk) => (
              <div key={wk} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-widest text-white/45">Week {wk}</p>
                <ul className="mt-2 space-y-2">
                  {(timelineWeeks.groups.get(wk) ?? []).map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/85">
                      <span>{e.title}</span>
                      <span className="text-white/45">{new Date(e.startsAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
