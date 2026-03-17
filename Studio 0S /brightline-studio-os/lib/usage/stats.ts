import "server-only";

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type WorkspaceLimits = {
  plan: string;
  maxProjects: number;
  maxDrafts: number;
  maxActiveAutomations: number;
};

export type WorkspaceUsageSnapshot = {
  counts: {
    projects: number;
    drafts: number;
    activeAutomations: number;
  };
  limits: WorkspaceLimits;
  usageTotals: {
    agentUsage: number;
    draftsGenerated: number;
    workflowsTriggered: number;
  };
};

export function getWorkspaceLimits(workspaceId?: string): WorkspaceLimits {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);

  const row = db
    .prepare(
      "SELECT plan, max_projects AS maxProjects, max_drafts AS maxDrafts, max_active_automations AS maxActiveAutomations FROM plan_limits WHERE workspace_id = ? LIMIT 1"
    )
    .get(wsId) as
    | { plan: string; maxProjects: number; maxDrafts: number; maxActiveAutomations: number }
    | undefined;

  if (row) return row;

  return { plan: "free", maxProjects: 10, maxDrafts: 200, maxActiveAutomations: 3 };
}

export function getWorkspaceUsageSnapshot(workspaceId?: string): WorkspaceUsageSnapshot {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const limits = getWorkspaceLimits(wsId);

  const projectsRow = db.prepare("SELECT COUNT(*) AS cnt FROM projects WHERE workspace_id = ?").get(wsId) as { cnt: number };
  const draftsRow = db.prepare("SELECT COUNT(*) AS cnt FROM drafts WHERE workspace_id = ?").get(wsId) as { cnt: number };

  // "Active automations" are represented as scheduled jobs for now (track-only, no enforcement).
  const automationsRow = db
    .prepare("SELECT COUNT(*) AS cnt FROM jobs WHERE workspace_id = ? AND status = 'scheduled'")
    .get(wsId) as { cnt: number };

  const totals = db
    .prepare(
      `SELECT event_type AS eventType, COALESCE(SUM(quantity), 0) AS total
       FROM usage_events
       WHERE workspace_id = ?
       GROUP BY event_type`
    )
    .all(wsId) as { eventType: string; total: number }[];

  const map = new Map(totals.map((t) => [t.eventType, t.total]));
  return {
    counts: {
      projects: projectsRow.cnt,
      drafts: draftsRow.cnt,
      activeAutomations: automationsRow.cnt,
    },
    limits,
    usageTotals: {
      agentUsage: map.get("agent_usage") ?? 0,
      draftsGenerated: map.get("drafts_generated") ?? 0,
      workflowsTriggered: map.get("workflows_triggered") ?? 0,
    },
  };
}

export function getWorkspaceInfo(workspaceId?: string): { id: string; name: string; createdAt: string; ownerId: string } {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const row = db
    .prepare("SELECT id, name, owner_id AS ownerId, created_at AS createdAt FROM workspaces WHERE id = ? LIMIT 1")
    .get(wsId) as { id: string; name: string; ownerId: string; createdAt: string } | undefined;

  if (!row) {
    return { id: wsId, name: "Workspace", createdAt: new Date().toISOString(), ownerId: "usr-unknown" };
  }
  return row;
}

