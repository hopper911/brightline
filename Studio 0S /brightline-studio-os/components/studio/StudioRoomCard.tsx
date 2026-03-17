"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StudioRoom } from "@/lib/studio/mockData";

interface StudioRoomCardProps {
  room: StudioRoom;
  isSelected: boolean;
  isCenter?: boolean;
  onSelect: () => void;
}

export function StudioRoomCard({
  room,
  isSelected,
  isCenter = false,
  onSelect,
}: StudioRoomCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`w-full rounded-studio-xl border p-4 text-left transition-all duration-180 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-border focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg ${
        isCenter ? "sm:p-5" : ""
      } ${
        isSelected
          ? "border-accent-border bg-accent-glow/50 shadow-studio-glow"
          : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.03]"
      } ${isCenter ? "bg-gradient-to-br from-accent-glow/30 via-white/[0.02] to-transparent" : ""}`}
    >
      <p className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
        {isCenter ? "Hub" : "Room"}
      </p>
      <h3
        className={`mt-2 font-display font-medium text-white/95 ${
          isCenter ? "text-lg" : "text-base"
        }`}
      >
        {room.name}
      </h3>
      <p className="mt-0.5 text-sm text-white/55">{room.subtitle}</p>
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={room.status} />
      </div>
    </button>
  );
}
