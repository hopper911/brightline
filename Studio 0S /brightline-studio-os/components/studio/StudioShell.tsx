"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { disableDemoMode } from "@/app/studio/demo/actions";
import { ensureNimbusExampleProject, runNimbusAutomationTest } from "@/app/studio/actions";
import type { MissionControlData } from "@/lib/studio/missionControl";

interface StudioShellProps {
  data: MissionControlData;
  demoMode?: boolean;
}

function humanize(value: string): string {
  return value.replace(/_/g, " ");
}

const ROOM_TO_HREF: Record<string, string> = {
  reception: "/studio/crm",
  lounge: "/studio/crm/lounge",
  production: "/studio/production",
  editing: "/studio/production/editing",
  delivery: "/studio/production/delivery",
  marketing: "/studio/publishing",
  publishing: "/studio/publishing",
  archive: "/studio/projects/archive",
  strategy: "/studio/dashboard/strategy",
  events: "/studio/dashboard/events",
  sessions: "/studio/dashboard/sessions",
  automation: "/studio/settings/automation",
};

function getDraftHref(room: string): string {
  return ROOM_TO_HREF[room] ?? `/studio/${room}`;
}

export function StudioShell({ data, demoMode = false }: StudioShellProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>("main-studio");
  const selectedRoom = data.rooms.find((r) => r.id === selectedRoomId) ?? null;
  const params = useSearchParams();
  const showWelcomeFromQuery = params.get("welcome") === "1";
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const welcome = useMemo(() => {
    if (!showWelcomeFromQuery || welcomeDismissed) return null;
    const profile = data.workspaceProfile;
    if (!profile) return null;
    const wf = data.recommendedWorkflows[0] ?? null;

    const niche = profile.photographyType ? humanize(profile.photographyType) : "photography";
    const goal = profile.mainGoal ? humanize(profile.mainGoal) : "get more clients";

    const firstActions: { title: string; description: string; href: string }[] = [
      {
        title: "Run your first intake",
        description: "Paste a real inquiry and generate a reply draft.",
        href: "/studio/crm",
      },
      {
        title: "Create your first project",
        description: "Set up a project and generate a brief + shot list.",
        href: "/studio/production",
      },
      {
        title: "Review automation rules",
        description: "See the approval-driven reminders and follow-ups.",
        href: "/studio/settings/automation",
      },
    ];

    return { niche, goal, wf, firstActions };
  }, [data.recommendedWorkflows, data.workspaceProfile, showWelcomeFromQuery, welcomeDismissed]);

  const sessionsByRoom = useMemo(() => {
    const map = new Map<string, (typeof data.sessions)[number]>();
    for (const s of data.sessions) map.set(s.room, s);
    return map;
  }, [data.sessions]);

  const lanes = useMemo(() => {
    const laneRooms = [
      { room: "reception", label: "Reception", href: "/studio/crm" },
      { room: "production", label: "Production", href: "/studio/production" },
      { room: "editing", label: "Editing", href: "/studio/production/editing" },
      { room: "delivery", label: "Delivery", href: "/studio/production/delivery" },
      { room: "publishing", label: "Publishing", href: "/studio/publishing" },
      { room: "archive", label: "Archive", href: "/studio/projects/archive" },
      { room: "strategy", label: "Strategy", href: "/studio/dashboard/strategy" },
      { room: "automation", label: "Automation", href: "/studio/settings/automation" },
    ];
    return laneRooms.map((r) => {
      const session = sessionsByRoom.get(r.room) ?? null;
      const approvals = data.pendingApprovalsByRoom?.[r.room]?.length ?? 0;
      const draftsTotal = data.draftCountsByRoom?.[r.room]?.total ?? 0;
      const lastEvent = data.recentEventsByRoom?.[r.room]?.[0] ?? null;
      return { ...r, session, approvals, draftsTotal, lastEvent };
    });
  }, [data.draftCountsByRoom, data.pendingApprovalsByRoom, data.recentEventsByRoom, sessionsByRoom]);

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
              {demoMode && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/70">
                    Demo mode
                  </span>
                  <form action={disableDemoMode}>
                    <button
                      type="submit"
                      className="text-xs font-medium uppercase tracking-[0.12em] text-white/45 transition-colors hover:text-white/70"
                    >
                      Exit
                    </button>
                  </form>
                </div>
              )}
              <Link
                href="/studio/projects"
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
                href="/studio/settings/automation"
                className="text-xs font-medium uppercase tracking-[0.12em] text-white/45 transition-colors hover:text-white/70"
              >
                Automation
                {!data.entitlements.automation ? (
                  <span className="ml-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
                    Locked
                  </span>
                ) : null}
                {(data.automationQueue?.length ?? 0) > 0 ? (
                  <span
                    className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400/20 px-1 text-[10px] font-medium text-amber-300"
                    aria-label={`${data.automationQueue?.length ?? 0} automation item(s) awaiting approval`}
                  >
                    {data.automationQueue?.length ?? 0}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/studio/production/approvals"
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
                <span className="ml-1 text-[10px] uppercase tracking-[0.12em] text-white/35">
                  {data.plan.name}
                </span>
              </Link>
            </div>
          </div>
        </header>

        {welcome && (
          <Panel padding="lg" className="mb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="font-display text-[10px] font-medium uppercase tracking-[0.3em] text-white/45">
                  Welcome
                </p>
                <h2 className="mt-2 font-display text-xl font-medium tracking-tight text-white/95">
                  Your Studio OS is tuned for {welcome.niche}.
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  Primary goal: <span className="text-white/80">{welcome.goal}</span>. Here are the fastest next steps to feel value today.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWelcomeDismissed(true)}
                className="self-start rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white/70 transition-colors hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Dismiss
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-white/55">First actions</h3>
                <ul className="space-y-2">
                  {welcome.firstActions.map((a) => (
                    <li key={a.href}>
                      <Link
                        href={a.href}
                        className="block rounded-studio-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-display text-sm font-medium text-white/90">{a.title}</div>
                            <div className="mt-1 text-sm text-white/55">{a.description}</div>
                          </div>
                          <span className="text-xs font-medium uppercase tracking-[0.12em] text-accent">Open</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-white/55">Sample workflow</h3>
                {welcome.wf ? (
                  <div className="rounded-studio-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-display text-sm font-medium text-white/90">{welcome.wf.name}</div>
                        <div className="mt-1 text-sm text-white/55">{welcome.wf.why}</div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
                        {welcome.wf.id}
                      </span>
                    </div>
                    <ol className="mt-4 space-y-2">
                      {welcome.wf.steps.slice(0, 5).map((s, idx) => (
                        <li key={`${s.label}-${idx}`} className="flex items-center justify-between gap-4">
                          <span className="text-sm text-white/80">
                            <span className="text-white/45 tabular-nums">{String(idx + 1).padStart(2, "0")}.</span>{" "}
                            {s.label}
                          </span>
                          <span className="text-xs text-white/45">{s.roomHint}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <div className="text-sm text-white/55">No workflow recommendations yet.</div>
                )}
              </div>
            </div>
          </Panel>
        )}

        <SummaryCards items={data.summaryMetrics} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
          <section className="space-y-4">
            <Panel padding="base">
              <SectionHeader title="Agent lanes" subtitle="Work-in-progress by room (events, approvals, drafts)" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {lanes.map((lane) => (
                  <Link
                    key={lane.room}
                    href={lane.href}
                    className="group rounded-studio-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-sm font-medium text-white/90">{lane.label}</div>
                        <div className="mt-1 text-xs text-white/45">
                          {lane.session?.lastAction ? `Last: ${lane.session.lastAction}` : "No session yet"}
                        </div>
                      </div>
                      <span className="text-xs font-medium uppercase tracking-[0.12em] text-accent opacity-0 transition-opacity group-hover:opacity-100">
                        Open
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
                        Drafts {lane.draftsTotal}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
                        Approvals {lane.approvals}
                      </span>
                    </div>
                    {lane.lastEvent?.summary ? (
                      <p className="mt-3 text-xs text-white/55">
                        {lane.lastEvent.summary.slice(0, 90)}
                        {lane.lastEvent.summary.length > 90 ? "…" : ""}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-white/35">No recent events.</p>
                    )}
                  </Link>
                ))}
              </div>
            </Panel>
          </section>

          <aside className="space-y-4">
            <Panel padding="base">
              <SectionHeader title="Project spotlight" subtitle="Canonical example project + automation test" />
              {data.projectSpotlight ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="font-display text-sm font-medium text-white/90">{data.projectSpotlight.name}</div>
                    <div className="mt-1 text-xs text-white/55">
                      {data.projectSpotlight.client ? `Client: ${data.projectSpotlight.client}` : "Client: —"}{" "}
                      {data.projectSpotlight.deliverBy ? `· Deliver by ${data.projectSpotlight.deliverBy}` : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
                      Events {data.projectSpotlight.events.length}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
                      Drafts {data.projectSpotlight.drafts.length}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
                      Approvals {data.projectSpotlight.approvals.length}
                    </span>
                  </div>

                  <form action={runNimbusAutomationTest} className="pt-1">
                    <input type="hidden" name="projectId" value={data.projectSpotlight.projectId} />
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      Run automation test
                    </button>
                  </form>

                  <p className="text-xs text-white/40">
                    This triggers the <span className="text-white/60">New Client Workflow</span> against the spotlight project and should enqueue an approval in
                    Automation.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-white/55">
                    No spotlight project yet. Create the Nimbus example project to connect agents end-to-end.
                  </p>
                  <form action={ensureNimbusExampleProject}>
                    <button
                      type="submit"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      Create example project
                    </button>
                  </form>
                </div>
              )}
            </Panel>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <Panel className="min-h-[160px]" padding="base">
              <SectionHeader
                title="Recent activity"
                action={
                  <Link
                    href="/studio/dashboard/events"
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
                    href="/studio/production/delivery"
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
                          href={getDraftHref(d.room)}
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
                    href="/studio/projects"
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
                          href="/studio/projects"
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
