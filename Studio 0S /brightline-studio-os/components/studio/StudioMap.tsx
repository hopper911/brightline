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
      aria-label="Studio room map"
      className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#0a0b0f]/80 p-4 shadow-[0_0_40px_rgba(0,0,0,0.4)] sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(139,92,246,0.06),transparent)]" />
      <div className="relative">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.25em] text-white/40">
          Studio floor plan
        </p>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
