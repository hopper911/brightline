"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StudioRoom } from "@/lib/studio/mockData";

interface RoomDetailsPanelProps {
  room: StudioRoom | null;
}

export function RoomDetailsPanel({ room }: RoomDetailsPanelProps) {
  if (!room) {
    return (
      <aside
        aria-label="Room details"
        className="flex flex-col rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 shadow-[0_0_24px_rgba(0,0,0,0.3)]"
      >
        <p className="text-sm text-white/45">Select a room to view details.</p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Room details"
      className="flex flex-col rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 shadow-[0_0_24px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{room.name}</h2>
          <p className="text-sm text-white/55">{room.subtitle}</p>
        </div>
        <StatusBadge status={room.status} />
      </div>
      {room.description ? (
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          {room.description}
        </p>
      ) : null}
      {room.keyTasks && room.keyTasks.length > 0 ? (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
            Key tasks
          </p>
          <ul className="mt-2 space-y-2 text-sm text-white/70">
            {room.keyTasks.map((task) => (
              <li key={task} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/80" />
                {task}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-auto pt-6">
        <Link
          href={room.id === "main-studio" ? "/studio" : `/studio/${room.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:bg-violet-500 hover:shadow-[0_0_24px_rgba(139,92,246,0.4)]"
        >
          Open {room.name}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </aside>
  );
}
