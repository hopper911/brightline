/**
 * Bright Line Studio OS – mission control data aggregation
 *
 * Computes real metrics and dashboard data from stores.
 */

import { MOCK_ROOMS, type SummaryMetric } from "./mockData";
import { isVercelVisualOnly } from "@/lib/runtime/vercel";
import { isDemoMode } from "@/lib/runtime/demo";
import { runWithDemoMode } from "@/lib/runtime/demoContext";
import { requireWorkspaceContext } from "@/lib/auth/workspaceContext";
import {
  DEMO_APPROVALS,
  DEMO_DRAFTS,
  DEMO_EVENTS,
  DEMO_HANDOFFS,
  DEMO_JOBS,
  DEMO_PROJECTS,
  DEMO_SUMMARY_METRICS,
} from "@/lib/studio/demoData";
import { getWorkspacePlan, type Entitlements } from "@/lib/billing/entitlements";
import { getWorkspaceProfile, type WorkspaceProfile } from "@/lib/profile/store";
import { getDefaultWorkflows, type RecommendedWorkflow } from "@/lib/workflows";
import type { EventRecord } from "@/lib/events/logger";
import type { Approval } from "@/lib/approvals/store";
import type { Draft } from "@/lib/drafts/store";
import type { Job } from "@/lib/jobs";
import type { Handoff } from "@/lib/handoffs/store";
import type { Reminder } from "@/lib/reminders/store";
import type { Invoice, Payment } from "@/lib/finance/store";

const ROOM_TO_AGENT: Record<string, string> = {
  reception: "Concierge Agent",
  lounge: "Briefing Assistant",
  production: "Producer Agent",
  "main-studio": "Session Agent",
  editing: "Editing Agent",
  delivery: "Delivery Agent",
  marketing: "Marketing Agent",
  publishing: "Marketing Agent",
  archive: "Archivist Agent",
  strategy: "Founder Strategy Agent",
  jobs: "Jobs",
};

export type JobIndicator = Pick<Job, "id" | "jobType" | "resultSummary">;

export type MissionControlData = {
  plan: { id: string; name: string; price: number };
  entitlements: Entitlements;
  workspaceProfile: WorkspaceProfile | null;
  recommendedWorkflows: RecommendedWorkflow[];
  summaryMetrics: SummaryMetric[];
  rooms: typeof MOCK_ROOMS;
  sessions: {
    room: string;
    agent: string;
    lastAction: string | null;
    lastOutput: string | null;
    status: string;
    projectId: string | null;
  }[];
  recentEvents: EventRecord[];
  pendingApprovals: Approval[];
  recentDrafts: Draft[];
  jobIndicators: JobIndicator[];
  jobsSummary: { scheduled: number; completed: number };
  recentHandoffs: Handoff[];
  activeProjectsCount: number;
  projectsByStatus: Record<string, number>;

  recentEventsByRoom?: Record<string, EventRecord[]>;
  pendingApprovalsByRoom?: Record<string, Approval[]>;
  draftCountsByRoom?: Record<string, { total: number; byType: Record<string, number> }>;

  automationQueue?: Approval[];
  recentAutomationEvents?: EventRecord[];

  projectSpotlight?: {
    projectId: string;
    name: string;
    client: string | null;
    status: string | null;
    stage: string | null;
    deliverBy: string | null;
    events: EventRecord[];
    drafts: Draft[];
    approvals: Approval[];
    reminders: Reminder[];
    jobs: Job[];
    invoices: Invoice[];
    payments: Payment[];
  };
};

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = keyFn(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

function countDraftsByRoom(drafts: Draft[]): Record<string, { total: number; byType: Record<string, number> }> {
  const out: Record<string, { total: number; byType: Record<string, number> }> = {};
  for (const d of drafts) {
    const bucket = (out[d.room] ??= { total: 0, byType: {} });
    bucket.total += 1;
    bucket.byType[d.type] = (bucket.byType[d.type] ?? 0) + 1;
  }
  return out;
}

export async function getMissionControlData(): Promise<MissionControlData> {
  const plan = getWorkspacePlan();
  const { workspaceId } = await requireWorkspaceContext();
  const workspaceProfile = getWorkspaceProfile(workspaceId);
  const recommendedWorkflows = getDefaultWorkflows(workspaceProfile);
  if (isVercelVisualOnly()) {
    return {
      plan: { id: plan.id, name: plan.name, price: plan.price },
      entitlements: plan.limits,
      workspaceProfile,
      recommendedWorkflows,
      summaryMetrics: [
        { id: "activeProjects", label: "Active Projects", value: "—", hint: "Vercel visual-only" },
        { id: "awaitingApproval", label: "Pending Approvals", value: "—", hint: "Vercel visual-only" },
        { id: "deliveryDrafts", label: "Delivery Drafts", value: "—", hint: "Vercel visual-only" },
        { id: "contentQueue", label: "Content Queue", value: "—", hint: "Vercel visual-only" },
      ],
      rooms: MOCK_ROOMS,
      sessions: [],
      recentEvents: [],
      pendingApprovals: [],
      recentDrafts: [],
      jobIndicators: [],
      jobsSummary: { scheduled: 0, completed: 0 },
      recentHandoffs: [],
      activeProjectsCount: 0,
      projectsByStatus: {},
    };
  }

  const demo = await isDemoMode();
  if (demo) {
    return runWithDemoMode(true, async () => {
      const byStatus: Record<string, number> = {};
      for (const p of DEMO_PROJECTS) {
        const s = p.status ?? "unknown";
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }

      const jobIndicators = DEMO_JOBS.filter((j) => j.status === "completed").slice(0, 5);
      const jobsSummary = {
        scheduled: DEMO_JOBS.filter((j) => j.status === "scheduled").length,
        completed: DEMO_JOBS.filter((j) => j.status === "completed").length,
      };

      const demoEvents: EventRecord[] = DEMO_EVENTS.map((e) => ({
        id: e.id,
        room: e.room,
        projectId: e.projectId,
        agent: e.agent,
        type: e.type,
        status: e.status,
        summary: e.summary,
        createdAt: e.createdAt,
      }));
      const demoApprovals: Approval[] = DEMO_APPROVALS.map((a) => ({
        id: a.id,
        workspaceId: "demo-workspace",
        actionType: a.actionType,
        room: a.room,
        status: a.status,
        payloadJson: a.payloadJson,
        createdAt: a.createdAt,
      }));
      const demoDrafts: Draft[] = DEMO_DRAFTS.map((d) => ({
        id: d.id,
        type: d.type,
        room: d.room,
        content: d.content,
        createdAt: d.createdAt,
        projectId: d.projectId,
      }));

      const recentEventsByRoom = groupBy(demoEvents, (e) => e.room);
      const pendingApprovalsByRoom = groupBy(demoApprovals, (a) => a.room);
      const draftCountsByRoom = countDraftsByRoom(demoDrafts);
      const automationQueue = demoApprovals.filter(
        (a) => a.actionType === "automation_prepared_action" && a.status === "pending"
      );
      const recentAutomationEvents = demoEvents
        .filter((e) => e.room === "automation" || e.type.startsWith("automation_"))
        .slice(0, 20);

      const spotlight = DEMO_PROJECTS[0] ?? null;
      const projectSpotlight = spotlight
        ? {
            projectId: spotlight.id,
            name: spotlight.name,
            client: spotlight.client ?? null,
            status: spotlight.status ?? null,
            stage: null,
            deliverBy: null,
            events: demoEvents.filter((e) => e.projectId === spotlight.id),
            drafts: demoDrafts.filter((d) => d.projectId === spotlight.id),
            approvals: demoApprovals.filter((a) => a.payloadJson?.includes(spotlight.id) ?? false),
            reminders: [],
            jobs: [],
            invoices: [],
            payments: [],
          }
        : undefined;

      return {
        plan: { id: plan.id, name: plan.name, price: plan.price },
        entitlements: plan.limits,
        workspaceProfile,
        recommendedWorkflows,
        summaryMetrics: DEMO_SUMMARY_METRICS,
        rooms: MOCK_ROOMS,
        sessions: [],
        recentEvents: demoEvents.slice(0, 10),
        pendingApprovals: demoApprovals,
        recentDrafts: demoDrafts.slice(0, 8),
        jobIndicators: jobIndicators as unknown as JobIndicator[],
        jobsSummary,
        recentHandoffs: DEMO_HANDOFFS.slice(0, 10) as unknown as Handoff[],
        activeProjectsCount: DEMO_PROJECTS.length,
        projectsByStatus: byStatus,

        recentEventsByRoom,
        pendingApprovalsByRoom,
        draftCountsByRoom,
        automationQueue,
        recentAutomationEvents,
        projectSpotlight,
      };
    });
  }

  // Lazy-load SQLite-backed stores so Vercel never imports them.
  const { listProjectsForWorkspace } = await import("@/lib/projects/store");
  const { getPendingApprovalsForWorkspace } = await import("@/lib/approvals/store");
  const { getDraftsForWorkspace } = await import("@/lib/drafts/store");
  const { getEventsForWorkspace } = await import("@/lib/events/logger");
  const { getJobsForWorkspace, getRecentJobIndicatorsForWorkspace } = await import("@/lib/jobs");
  const { getAllSessionsForWorkspace } = await import("@/lib/sessions/store");
  const { getRecentHandoffsForWorkspace } = await import("@/lib/handoffs/store");

  const projects = listProjectsForWorkspace(workspaceId);
  const approvals = getPendingApprovalsForWorkspace(workspaceId);
  const drafts = getDraftsForWorkspace(workspaceId);
  const events = getEventsForWorkspace(workspaceId);
  const jobs = getJobsForWorkspace(workspaceId, { limit: 100 });
  const jobIndicators = getRecentJobIndicatorsForWorkspace(workspaceId, 5);
  const sessions = getAllSessionsForWorkspace(workspaceId);
  const handoffs = getRecentHandoffsForWorkspace(workspaceId, 10);

  const byStatus: Record<string, number> = {};
  for (const p of projects) {
    const s = p.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  const sessionsWithAgent = sessions.map((s) => ({
    room: s.room,
    agent: ROOM_TO_AGENT[s.room] ?? s.room,
    lastAction: s.lastAction,
    lastOutput: s.lastOutput,
    status: s.status,
    projectId: s.projectId,
  }));

  const deliveryDrafts = drafts.filter((d) => d.room === "delivery").length;
  const marketingDrafts = drafts.filter((d) => d.room === "marketing").length;

  const recentEventsByRoom = groupBy(events, (e) => e.room);
  const pendingApprovalsByRoom = groupBy(approvals, (a) => a.room);
  const draftCountsByRoom = countDraftsByRoom(drafts);

  const automationQueue = approvals.filter(
    (a) => a.actionType === "automation_prepared_action" && a.status === "pending"
  );
  const recentAutomationEvents = events
    .filter((e) => e.room === "automation" || e.type.startsWith("automation_"))
    .slice(0, 20);

  const spotlightProject =
    projects.find(
      (p) =>
        p.name.toLowerCase().includes("corporate headshots") ||
        p.name.toLowerCase().includes("nimbus analytics")
    ) ??
    projects[0] ??
    null;

  let projectSpotlight: MissionControlData["projectSpotlight"] = undefined;
  if (spotlightProject) {
    const spotlightId = spotlightProject.id;
    const [{ listReminders }, { getInvoicesByProjectForWorkspace, getPaymentsByProjectForWorkspace }] = await Promise.all([
      import("@/lib/reminders/store"),
      import("@/lib/finance/store"),
    ]);

    const reminders = listReminders({ workspaceId, projectId: spotlightId });
    const invoices = getInvoicesByProjectForWorkspace(workspaceId, spotlightId);
    const payments = getPaymentsByProjectForWorkspace(workspaceId, spotlightId);
    const deliverBy = spotlightProject.timeline?.deliverBy ?? null;

    projectSpotlight = {
      projectId: spotlightId,
      name: spotlightProject.name,
      client: spotlightProject.client,
      status: spotlightProject.status,
      stage: spotlightProject.stage,
      deliverBy,
      events: events.filter((e) => e.projectId === spotlightId),
      drafts: drafts.filter((d) => d.projectId === spotlightId),
      approvals: approvals.filter((a) => a.payloadJson?.includes(spotlightId) ?? false),
      reminders,
      jobs: jobs.filter((j) => j.projectId === spotlightId),
      invoices,
      payments,
    };
  }

  return {
    plan: { id: plan.id, name: plan.name, price: plan.price },
    entitlements: plan.limits,
    workspaceProfile,
    recommendedWorkflows,
    summaryMetrics: [
      { id: "activeProjects", label: "Active Projects", value: projects.length, hint: "Total" },
      { id: "awaitingApproval", label: "Pending Approvals", value: approvals.length, hint: "Sign-off" },
      { id: "deliveryDrafts", label: "Delivery Drafts", value: deliveryDrafts, hint: "Delivery" },
      { id: "contentQueue", label: "Content Queue", value: marketingDrafts, hint: "Marketing" },
    ],
    rooms: MOCK_ROOMS,
    sessions: sessionsWithAgent,
    recentEvents: events.slice(0, 10),
    pendingApprovals: approvals,
    recentDrafts: drafts.slice(0, 8),
    jobIndicators,
    jobsSummary: {
      scheduled: jobs.filter((j) => j.status === "scheduled").length,
      completed: jobs.filter((j) => j.status === "completed").length,
    },
    recentHandoffs: handoffs,
    activeProjectsCount: projects.length,
    projectsByStatus: byStatus,

    recentEventsByRoom,
    pendingApprovalsByRoom,
    draftCountsByRoom,
    automationQueue,
    recentAutomationEvents,
    projectSpotlight,
  };
}
