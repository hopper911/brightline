"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Panel } from "@/components/studio/Panel";
import { EmptyState } from "@/components/studio/EmptyState";
import type { StudioRoom } from "@/lib/studio/mockData";

interface RoomDetailsPanelProps {
  room: StudioRoom | null;
}

export function RoomDetailsPanel({ room }: RoomDetailsPanelProps) {
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
      {room.description ? (
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          {room.description}
        </p>
      ) : null}
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
          href={room.id === "main-studio" ? "/studio" : `/studio/${room.id}`}
          className="inline-flex items-center gap-2 rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2.5 text-sm font-medium text-white/95 transition-all duration-180 hover:bg-accent/15 hover:border-accent/30"
        >
          Open {room.name}
          <span aria-hidden className="text-accent-muted">→</span>
        </Link>
      </div>
    </Panel>
  );
}
