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
      className={`w-full rounded-[24px] border p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b0f] ${
        isCenter
          ? "bg-gradient-to-br from-violet-500/10 via-white/[0.03] to-transparent"
          : "bg-white/[0.02]"
      } ${
        isSelected
          ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_32px_rgba(139,92,246,0.25)]"
          : "border-white/[0.06] hover:border-violet-500/30 hover:bg-white/[0.04]"
      } ${isCenter ? "sm:p-5" : ""}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
        {isCenter ? "Hub" : "Room"}
      </p>
      <h3 className={`mt-2 font-semibold text-white ${isCenter ? "text-lg" : "text-base"}`}>
        {room.name}
      </h3>
      <p className="mt-1 text-sm text-white/55">{room.subtitle}</p>
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={room.status} />
      </div>
    </button>
  );
}
