/**
 * Bright Line Studio OS – approval store (SQLite)
 *
 * Tracks pending approvals. Approve or reject actions.
 */

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";

export type Approval = {
  id: string;
  workspaceId: string;
  actionType: string;
  room: string;
  status: "pending" | "approved" | "rejected";
  payloadJson: string | null;
  createdAt: string;
};

function nextId(): string {
  return `appr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type CreateApprovalInput = {
  actionType: string;
  room: string;
  payload: unknown;
  workspaceId?: string;
  projectId?: string | null;
};

export function createApproval(input: CreateApprovalInput): Approval {
  assertNotDemoMode("Creating approvals");
  const id = nextId();
  const createdAt = new Date().toISOString();
  const payloadJson = JSON.stringify(input.payload ?? null);
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  const stmt = db.prepare(
    "INSERT INTO approvals (id, workspace_id, action_type, room, project_id, status, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  stmt.run(id, wsId, input.actionType, input.room, input.projectId ?? null, "pending", payloadJson);
  return {
    id,
    workspaceId: wsId,
    actionType: input.actionType,
    room: input.room,
    status: "pending",
    payloadJson,
    createdAt,
  };
}

export function getApprovalsByProject(projectId: string): Approval[] {
  return getApprovalsByProjectForWorkspace(undefined, projectId);
}

export function getApprovalsByProjectForWorkspace(workspaceId: string | undefined, projectId: string): Approval[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  try {
    const rows = db
      .prepare(
        "SELECT id, workspace_id AS workspaceId, action_type AS actionType, room, status, payload_json AS payloadJson, created_at AS createdAt FROM approvals WHERE workspace_id = ? AND project_id = ? ORDER BY created_at DESC"
      )
      .all(wsId, projectId) as Approval[];
    return rows;
  } catch {
    return [];
  }
}

export function getPendingApprovals(): Approval[] {
  return getPendingApprovalsForWorkspace(undefined);
}

export function getPendingApprovalsForWorkspace(workspaceId: string | undefined): Approval[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      "SELECT id, workspace_id AS workspaceId, action_type AS actionType, room, status, payload_json AS payloadJson, created_at AS createdAt FROM approvals WHERE workspace_id = ? AND status = 'pending' ORDER BY created_at ASC"
    )
    .all(wsId) as Approval[];
  return rows;
}

export function approveAction(id: string): Approval | null {
  assertNotDemoMode("Approving actions");
  return approveActionForWorkspace(undefined, id);
}

export function approveActionForWorkspace(workspaceId: string | undefined, id: string): Approval | null {
  assertNotDemoMode("Approving actions");
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const stmt = db.prepare(
    "UPDATE approvals SET status = 'approved' WHERE workspace_id = ? AND id = ? AND status = 'pending'"
  );
  const result = stmt.run(wsId, id);
  if (result.changes === 0) return null;
  const row = db
    .prepare(
      "SELECT id, workspace_id AS workspaceId, action_type AS actionType, room, status, payload_json AS payloadJson, created_at AS createdAt FROM approvals WHERE workspace_id = ? AND id = ?"
    )
    .get(wsId, id) as Approval | undefined;
  return row ?? null;
}

export function rejectAction(id: string): Approval | null {
  assertNotDemoMode("Rejecting actions");
  return rejectActionForWorkspace(undefined, id);
}

export function rejectActionForWorkspace(workspaceId: string | undefined, id: string): Approval | null {
  assertNotDemoMode("Rejecting actions");
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const stmt = db.prepare(
    "UPDATE approvals SET status = 'rejected' WHERE workspace_id = ? AND id = ? AND status = 'pending'"
  );
  const result = stmt.run(wsId, id);
  if (result.changes === 0) return null;
  const row = db
    .prepare(
      "SELECT id, workspace_id AS workspaceId, action_type AS actionType, room, status, payload_json AS payloadJson, created_at AS createdAt FROM approvals WHERE workspace_id = ? AND id = ?"
    )
    .get(wsId, id) as Approval | undefined;
  return row ?? null;
}
