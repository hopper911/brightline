/**
 * Bright Line Studio OS – mission control data aggregation
 *
 * Computes real metrics and dashboard data from stores.
 */

import { listProjects } from "@/lib/projects/store";
import { getPendingApprovals } from "@/lib/approvals/store";
import { getDrafts } from "@/lib/drafts/store";
import { getEvents } from "@/lib/events/logger";
import { getJobs, getRecentJobIndicators } from "@/lib/jobs";
import { getAllSessions } from "@/lib/sessions/store";
import { getRecentHandoffs } from "@/lib/handoffs/store";
import { MOCK_ROOMS, type SummaryMetric } from "./mockData";
import { isVercelVisualOnly } from "@/lib/runtime/vercel";

const ROOM_TO_AGENT: Record<string, string> = {
  reception: "Concierge Agent",
  lounge: "Briefing Assistant",
  production: "Producer Agent",
  "main-studio": "Session Agent",
  editing: "Editing Agent",
  delivery: "Delivery Agent",
  marketing: "Marketing Agent",
  archive: "Archivist Agent",
  strategy: "Founder Strategy Agent",
  jobs: "Jobs",
};

export type MissionControlData = {
  summaryMetrics: SummaryMetric[];
  rooms: typeof MOCK_ROOMS;
  sessions: { room: string; agent: string; lastAction: string | null; lastOutput: string | null; status: string; projectId: string | null }[];
  recentEvents: ReturnType<typeof getEvents>;
  pendingApprovals: ReturnType<typeof getPendingApprovals>;
  recentDrafts: ReturnType<typeof getDrafts>;
  jobIndicators: ReturnType<typeof getRecentJobIndicators>;
  jobsSummary: { scheduled: number; completed: number };
  recentHandoffs: ReturnType<typeof getRecentHandoffs>;
  activeProjectsCount: number;
  projectsByStatus: Record<string, number>;
};

export function getMissionControlData(): MissionControlData {
  if (isVercelVisualOnly()) {
    return {
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

  const projects = listProjects();
  const approvals = getPendingApprovals();
  const drafts = getDrafts();
  const events = getEvents();
  const jobs = getJobs({ limit: 100 });
  const jobIndicators = getRecentJobIndicators(5);
  const sessions = getAllSessions();
  const handoffs = getRecentHandoffs(10);

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

  return {
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
  };
}
