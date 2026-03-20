"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Panel } from "@/components/studio/Panel";
import { EmptyState } from "@/components/studio/EmptyState";
import type { StudioRoom } from "@/lib/studio/mockData";
import { getAssistMode, setAssistMode } from "@/app/studio/actions";
import type { AssistMode } from "@/lib/roomSettings/store";

const ROOM_TO_HREF: Record<string, string> = {
  reception: "/studio/crm",
  lounge: "/studio/crm/lounge",
  production: "/studio/production",
  editing: "/studio/production/editing",
  delivery: "/studio/production/delivery",
  marketing: "/studio/publishing",
  publishing: "/studio/publishing",
  archive: "/studio/projects/archive",
  strategy: "/studio/dashboard/strategy",
  events: "/studio/dashboard/events",
  sessions: "/studio/dashboard/sessions",
  automation: "/studio/settings/automation",
};

interface RoomDetailsPanelProps {
  room: StudioRoom | null;
}

export function RoomDetailsPanel({ room }: RoomDetailsPanelProps) {
  const [assistMode, setLocalAssistMode] = useState<AssistMode>("off");
  const [isPending, startTransition] = useTransition();
  const isActive = assistMode !== "off";
  const assistLabel = useMemo(() => {
    if (assistMode === "suggest") return "Suggest Mode";
    if (assistMode === "assist") return "Assist Mode";
    return "Off";
  }, [assistMode]);

  useEffect(() => {
    let cancelled = false;
    if (!room) return;
    startTransition(() => {
      getAssistMode({ room: room.id })
        .then((mode) => {
          if (!cancelled) setLocalAssistMode(mode);
        })
        .catch(() => {
          if (!cancelled) setLocalAssistMode("off");
        });
    });
    return () => {
      cancelled = true;
    };
  }, [room?.id]);

  if (!room) {
    return (
      <Panel as="aside" className="flex flex-col justify-center" padding="lg">
        <EmptyState
          title="Select a room"
          description="Click a room on the floor plan to view its details and open the workspace."
        />
      </Panel>
    );
  }

  return (
    <Panel as="aside" className="flex flex-col" padding="lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-medium text-white/95">{room.name}</h2>
          <p className="text-sm text-white/55">{room.subtitle}</p>
          {room.agent ? (
            <p className="mt-1 font-display text-[10px] font-medium uppercase tracking-[0.15em] text-accent-muted">
              {room.agent}
            </p>
          ) : null}
        </div>
        <StatusBadge status={room.status} />
      </div>
      {isActive ? (
        <div className="mt-4 rounded-studio-base border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-emerald-200">Assist Mode Active</p>
            <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-200/80">{assistLabel}</span>
          </div>
        </div>
      ) : null}
      {room.description ? (
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          {room.description}
        </p>
      ) : null}
      <div className="mt-5">
        <p className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
          Assist mode
        </p>
        <div
          className={`mt-2 inline-flex w-full rounded-full border border-white/10 bg-white/5 p-1 ${isPending ? "opacity-70" : ""}`}
          role="group"
          aria-label="Assist mode"
        >
          {(["off", "suggest", "assist"] as const).map((mode) => {
            const selected = assistMode === mode;
            const label = mode === "off" ? "Off" : mode === "suggest" ? "Suggest" : "Assist";
            return (
              <button
                key={mode}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setLocalAssistMode(mode);
                  startTransition(() => {
                    setAssistMode({ room: room.id, assistMode: mode }).then((res) => {
                      if (res.ok) setLocalAssistMode(res.assistMode);
                    });
                  });
                }}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
                  selected ? "bg-white/10 text-white/90" : "text-white/55 hover:text-white/75"
                }`}
                aria-pressed={selected}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-white/45">
          Suggest recommends actions without writing. Assist prepares drafts and queues approvals.
        </p>
      </div>
      {room.keyTasks && room.keyTasks.length > 0 ? (
        <div className="mt-5">
          <p className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
            Key tasks
          </p>
          <ul className="mt-2 space-y-2 text-sm text-white/65">
            {room.keyTasks.map((task) => (
              <li key={task} className="flex items-center gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full bg-accent-muted" />
                {task}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-auto pt-6">
        <Link
          href={room.id === "main-studio" ? "/studio/dashboard" : (ROOM_TO_HREF[room.id] ?? `/studio/${room.id}`)}
          className="inline-flex items-center gap-2 rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2.5 text-sm font-medium text-white/95 transition-all duration-180 hover:bg-accent/15 hover:border-accent/30"
        >
          Open {room.name}
          <span aria-hidden className="text-accent-muted">→</span>
        </Link>
      </div>
    </Panel>
  );
}
