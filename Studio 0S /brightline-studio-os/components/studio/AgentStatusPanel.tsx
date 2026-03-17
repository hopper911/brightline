"use client";

import { Panel } from "@/components/studio/Panel";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { EmptyState } from "@/components/studio/EmptyState";
import Link from "next/link";

type AgentSession = {
  room: string;
  agent: string;
  lastAction: string | null;
  lastOutput: string | null;
  status: string;
  projectId: string | null;
};

const ROOM_LABELS: Record<string, string> = {
  reception: "Reception",
  lounge: "Lounge",
  production: "Production",
  "main-studio": "Main Studio",
  editing: "Editing",
  delivery: "Delivery",
  marketing: "Marketing",
  archive: "Archive",
};

function truncate(s: string | null, max: number): string {
  if (!s) return "—";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

interface AgentStatusPanelProps {
  sessions: AgentSession[];
}

export function AgentStatusPanel({ sessions }: AgentStatusPanelProps) {
  return (
    <Panel padding="base" className="h-full">
      <SectionHeader
        title="Agent status"
        subtitle="Last action per room"
        action={
          sessions.length > 0 ? (
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
              {sessions.length} active
            </span>
          ) : null
        }
      />
      <div className="mt-4">
        {sessions.length === 0 ? (
          <EmptyState
            title="No active sessions"
            description="Agents become active when you use Reception, Production, Delivery, or Marketing."
          />
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.room}>
                <Link
                  href={`/studio/${s.room === "main-studio" ? "" : s.room}`}
                  className="block rounded-studio-base border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-sm transition-colors hover:border-accent-border hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white/90">{ROOM_LABELS[s.room] ?? s.agent}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                        s.status === "active" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/50"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">
                    {s.lastAction ? truncate(s.lastAction, 40) : "Idle"}
                  </p>
                  {s.lastOutput && (
                    <p className="mt-0.5 truncate text-xs text-white/55">{truncate(s.lastOutput, 60)}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
