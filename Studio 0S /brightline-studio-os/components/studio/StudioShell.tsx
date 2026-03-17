"use client";

import { useState } from "react";
import { RoomDetailsPanel } from "@/components/studio/RoomDetailsPanel";
import { StudioMap } from "@/components/studio/StudioMap";
import { SummaryCards } from "@/components/studio/SummaryCards";
import type { StudioRoom, SummaryMetric } from "@/lib/studio/mockData";

interface StudioShellProps {
  rooms: StudioRoom[];
  summaryMetrics: SummaryMetric[];
}

export function StudioShell({ rooms, summaryMetrics }: StudioShellProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>("main-studio");
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  return (
    <main className="min-h-screen bg-[#05060a] text-white/90">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/40">
            Bright Line Studio OS
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Mission Control
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Click a room to view details. Use the panel to open the workspace.
          </p>
        </header>

        <SummaryCards items={summaryMetrics} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <StudioMap
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
          />
          <RoomDetailsPanel room={selectedRoom} />
        </div>
      </div>
    </main>
  );
}
