"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

export type MissionControlNotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  studioProjectId: string | null;
  studioTaskId: string | null;
  studioScheduleEventId: string | null;
};

type Props = {
  initialNotifications: MissionControlNotificationRow[];
  tasksDueCount: number;
  eventsWeekCount: number;
};

export function MissionControlAlertsPanel({
  initialNotifications,
  tasksDueCount,
  eventsWeekCount,
}: Props) {
  const [items, setItems] = useState(initialNotifications);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/studio/notifications?unreadOnly=true&limit=20", {
      credentials: "include",
    });
    const data = (await res.json()) as { ok?: boolean; notifications?: MissionControlNotificationRow[]; error?: string };
    if (!res.ok || !data.ok || !data.notifications) {
      setError(data.error ?? "Could not load notifications.");
      return;
    }
    setItems(data.notifications);
  }, []);

  const runDigest = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/notifications/digest", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Digest failed.");
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const markRead = useCallback(
    async (id: string, read: boolean) => {
      setError(null);
      const res = await fetch(`/api/studio/notifications/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Update failed.");
        return;
      }
      await refresh();
    },
    [refresh]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/45">Tasks due (7d)</p>
          <p className="mt-1 text-2xl text-white">{tasksDueCount}</p>
          <Link href="/studio/tasks" className="mt-2 inline-block text-xs text-white/55 hover:text-white/85">
            Open tasks →
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/45">Events (7d)</p>
          <p className="mt-1 text-2xl text-white">{eventsWeekCount}</p>
          <Link href="/studio/calendar" className="mt-2 inline-block text-xs text-white/55 hover:text-white/85">
            Open calendar →
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/45">Digest</p>
          <p className="mt-1 text-sm text-white/55">Refresh reminders from tasks & schedule.</p>
          <button
            type="button"
            className="btn btn-ghost mt-2 text-xs"
            disabled={busy}
            onClick={() => void runDigest()}
          >
            {busy ? "Running…" : "Run digest"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.25em] text-white/45">Unread</p>
        <button type="button" className="text-xs text-white/50 hover:text-white/80" onClick={() => void refresh()}>
          Refresh list
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-white/50">No unread notifications. Run digest to generate from upcoming work.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div>
                <p className="text-sm text-white">{n.title}</p>
                {n.body ? <p className="mt-1 text-xs text-white/50">{n.body}</p> : null}
                <p className="mt-1 text-[10px] text-white/35">{new Date(n.createdAt).toLocaleString()}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
                  {n.studioProjectId ? (
                    <Link href={`/admin/projects/${n.studioProjectId}/edit`} className="text-amber-200/80 hover:text-amber-100">
                      Project
                    </Link>
                  ) : null}
                  {n.studioTaskId ? (
                    <Link href="/studio/tasks" className="text-white/45 hover:text-white/75">
                      Task
                    </Link>
                  ) : null}
                  {n.studioScheduleEventId ? (
                    <Link href="/studio/calendar" className="text-white/45 hover:text-white/75">
                      Calendar
                    </Link>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 text-xs text-white/55 hover:text-white"
                onClick={() => void markRead(n.id, true)}
              >
                Mark read
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
