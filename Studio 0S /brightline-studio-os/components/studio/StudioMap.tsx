"use client";

import { StudioRoomCard } from "@/components/studio/StudioRoomCard";
import { STUDIO_MAP_ORDER } from "@/lib/studio/mockData";
import type { StudioRoom } from "@/lib/studio/mockData";

interface StudioMapProps {
  rooms: StudioRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string) => void;
}

export function StudioMap({ rooms, selectedRoomId, onSelectRoom }: StudioMapProps) {
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  return (
    <section
      aria-label="Studio floor plan"
      className="relative overflow-hidden rounded-studio-2xl border border-white/[0.05] bg-studio-surface/80 p-5 shadow-studio-elevated sm:p-6"
    >
      <div className="pointer-events-none absolute inset-0 rounded-studio-xl bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(139,124,180,0.04),transparent)]" />
      <div className="relative">
        <p className="mb-5 font-display text-[10px] font-medium uppercase tracking-[0.25em] text-white/40">
          Studio floor plan
        </p>
        <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {STUDIO_MAP_ORDER.map((id) => {
            const room = roomMap.get(id);
            if (!room) return null;
            const isCenter = id === "main-studio";
            return (
              <StudioRoomCard
                key={room.id}
                room={room}
                isSelected={selectedRoomId === room.id}
                isCenter={isCenter}
                onSelect={() => onSelectRoom(room.id)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
