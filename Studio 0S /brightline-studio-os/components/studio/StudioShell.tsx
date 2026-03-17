"use client";

import { useState } from "react";
import Link from "next/link";
import { RoomDetailsPanel } from "@/components/studio/RoomDetailsPanel";
import { StudioMap } from "@/components/studio/StudioMap";
import { SummaryCards } from "@/components/studio/SummaryCards";
import { EventFeed } from "@/components/studio/EventFeed";
import { Panel } from "@/components/studio/Panel";
import { CardRow } from "@/components/studio/CardRow";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { EmptyState } from "@/components/studio/EmptyState";
import { AgentStatusPanel } from "@/components/studio/AgentStatusPanel";
import { HandoffFlow } from "@/components/studio/HandoffFlow";
import { GlobalSearch } from "@/components/studio/GlobalSearch";
import type { MissionControlData } from "@/lib/studio/missionControl";

interface StudioShellProps {
  data: MissionControlData;
}

export function StudioShell({ data }: StudioShellProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>("main-studio");
  const selectedRoom = data.rooms.find((r) => r.id === selectedRoomId) ?? null;

  return (
    <main className="min-h-screen bg-studio-bg text-white/90">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
              Bright Line Studio OS
            </p>
            <h1 className="mt-2 font-display text-2xl font-medium tracking-tight text-white/95 sm:text-3xl">
              Mission Control
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Command center. Rooms, agents, handoffs, and activity.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <GlobalSearch />
            <div className="flex shrink-0 gap-4">
              <Link
                href="/studio/jobs"
                className="relative inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white/45 transition-colors hover:text-white/70"
              >
                Jobs
                {data.jobIndicators.length > 0 && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent/20 px-1 text-[10px] font-medium text-accent"
                    aria-label={`${data.jobIndicators.length} recent job output(s)`}
                  >
                    {data.jobIndicators.length}
                  </span>
                )}
              </Link>
              <Link
                href="/studio/approvals"
                className="relative inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white/45 transition-colors hover:text-white/70"
              >
                Approvals
                {data.pendingApprovals.length > 0 && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400/20 px-1 text-[10px] font-medium text-amber-300"
                    aria-label={`${data.pendingApprovals.length} pending`}
                  >
                    {data.pendingApprovals.length}
                  </span>
                )}
              </Link>
              <Link
                href="/studio/settings"
                className="text-xs font-medium uppercase tracking-[0.12em] text-white/45 transition-colors hover:text-white/70"
              >
                Settings
              </Link>
            </div>
          </div>
        </header>

        <SummaryCards items={data.summaryMetrics} />

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <Panel className="min-h-[160px]" padding="base">
              <SectionHeader
                title="Recent activity"
                action={
                  <Link
                    href="/studio/events"
                    className="text-xs font-medium uppercase tracking-[0.1em] text-accent transition-colors hover:text-accent-muted"
                  >
                    View all
                  </Link>
                }
              />
              <div className="mt-4">
                {data.recentEvents.length > 0 ? (
                  <EventFeed events={data.recentEvents} compact maxItems={5} />
                ) : (
                  <EmptyState
                    title="No recent activity"
                    description="Events from rooms will appear here."
                  />
                )}
              </div>
            </Panel>
          </section>

          <section>
            <AgentStatusPanel sessions={data.sessions} />
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section>
            <HandoffFlow handoffs={data.recentHandoffs} />
          </section>

          <section>
            <Panel padding="base" className="h-full">
              <SectionHeader
                title="Recent drafts"
                action={
                  <Link
                    href="/studio/delivery"
                    className="text-xs font-medium uppercase tracking-[0.1em] text-accent transition-colors hover:text-accent-muted"
                  >
                    Delivery
                  </Link>
                }
              />
              <div className="mt-4">
                {data.recentDrafts.length > 0 ? (
                  <ul className="space-y-2">
                    {data.recentDrafts.slice(0, 4).map((d) => (
                      <li key={d.id}>
                        <CardRow
                          as="link"
                          href={d.room === "delivery" ? "/studio/delivery" : d.room === "marketing" ? "/studio/marketing" : `/studio/${d.room}`}
                          title={d.type}
                          meta={d.room}
                          snippet={d.content.slice(0, 80) + (d.content.length > 80 ? "…" : "")}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="No drafts yet"
                    description="Drafts from Delivery and Marketing will appear here."
                  />
                )}
              </div>
            </Panel>
          </section>

          <section>
            <Panel padding="base" className="h-full">
              <SectionHeader
                title="Jobs"
                subtitle={`${data.jobsSummary.scheduled} scheduled, ${data.jobsSummary.completed} completed`}
                action={
                  <Link
                    href="/studio/jobs"
                    className="text-xs font-medium uppercase tracking-[0.1em] text-accent transition-colors hover:text-accent-muted"
                  >
                    Manage
                  </Link>
                }
              />
              <div className="mt-4">
                {data.jobIndicators.length > 0 ? (
                  <ul className="space-y-2">
                    {data.jobIndicators.slice(0, 3).map((j) => (
                      <li key={j.id}>
                        <CardRow
                          as="link"
                          href="/studio/jobs"
                          title={j.jobType.replace(/_/g, " ")}
                          snippet={j.resultSummary ? j.resultSummary.slice(0, 80) + (j.resultSummary.length > 80 ? "…" : "") : "—"}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="No job output yet"
                    description="Run jobs from the Jobs page to see summaries."
                  />
                )}
              </div>
            </Panel>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
          <StudioMap
            rooms={data.rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
          />
          <RoomDetailsPanel room={selectedRoom} />
        </div>
      </div>
    </main>
  );
}
