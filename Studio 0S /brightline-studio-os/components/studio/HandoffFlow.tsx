"use client";

import Link from "next/link";
import { Panel } from "@/components/studio/Panel";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { EmptyState } from "@/components/studio/EmptyState";

type Handoff = {
  id: string;
  fromRoom: string;
  toRoom: string;
  payloadJson: string;
  status: string;
  createdAt: string;
};

const ROOM_LABELS: Record<string, string> = {
  reception: "Reception",
  production: "Production",
  editing: "Editing",
  delivery: "Delivery",
  marketing: "Marketing",
  archive: "Archive",
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60_000) return "Just now";
    if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

interface HandoffFlowProps {
  handoffs: Handoff[];
}

export function HandoffFlow({ handoffs }: HandoffFlowProps) {
  return (
    <Panel padding="base" className="h-full">
      <SectionHeader
        title="Handoffs"
        subtitle="Recent room-to-room passes"
        action={
          handoffs.length > 0 ? (
            <Link
              href="/studio/production"
              className="text-xs font-medium uppercase tracking-[0.1em] text-accent transition-colors hover:text-accent-muted"
            >
              Production
            </Link>
          ) : null
        }
      />
      <div className="mt-4">
        {handoffs.length === 0 ? (
          <EmptyState
            title="No handoffs yet"
            description="Handoffs appear when Reception passes leads to Production."
          />
        ) : (
          <ul className="space-y-2">
            {handoffs.slice(0, 5).map((h) => {
              let payload: { projectName?: string; client?: string } = {};
              try {
                payload = JSON.parse(h.payloadJson) ?? {};
              } catch {
                /* ignore */
              }
              const title = payload.projectName ?? "Handoff";
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-2 rounded-studio-base border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-sm"
                >
                  <span className="text-white/45">{ROOM_LABELS[h.fromRoom] ?? h.fromRoom}</span>
                  <span className="text-white/30">→</span>
                  <span className="text-white/45">{ROOM_LABELS[h.toRoom] ?? h.toRoom}</span>
                  <span className="min-w-0 flex-1 truncate text-white/80">{title}</span>
                  <span className="text-[10px] text-white/40">{formatTime(h.createdAt)}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      h.status === "pending"
                        ? "bg-amber-400/15 text-amber-300"
                        : h.status === "accepted"
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-white/10 text-white/50"
                    }`}
                  >
                    {h.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}
