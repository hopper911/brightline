/**
 * Bright Line Studio OS – approval store (SQLite)
 *
 * Tracks pending approvals. Approve or reject actions.
 */

import { getDb } from "@/lib/db";

export type Approval = {
  id: string;
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
};

export function createApproval(input: CreateApprovalInput): Approval {
  const id = nextId();
  const createdAt = new Date().toISOString();
  const payloadJson = JSON.stringify(input.payload ?? null);
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO approvals (id, action_type, room, status, payload_json) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(id, input.actionType, input.room, "pending", payloadJson);
  return {
    id,
    actionType: input.actionType,
    room: input.room,
    status: "pending",
    payloadJson,
    createdAt,
  };
}

export function getApprovalsByProject(projectId: string): Approval[] {
  const db = getDb();
  try {
    const rows = db
      .prepare(
        "SELECT id, action_type AS actionType, room, status, payload_json AS payloadJson, created_at AS createdAt FROM approvals WHERE project_id = ? ORDER BY created_at DESC"
      )
      .all(projectId) as Approval[];
    return rows;
  } catch {
    return [];
  }
}

export function getPendingApprovals(): Approval[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, action_type AS actionType, room, status, payload_json AS payloadJson, created_at AS createdAt FROM approvals WHERE status = 'pending' ORDER BY created_at ASC"
    )
    .all() as Approval[];
  return rows;
}

export function approveAction(id: string): Approval | null {
  const db = getDb();
  const stmt = db.prepare("UPDATE approvals SET status = 'approved' WHERE id = ? AND status = 'pending'");
  const result = stmt.run(id);
  if (result.changes === 0) return null;
  const row = db
    .prepare(
      "SELECT id, action_type AS actionType, room, status, payload_json AS payloadJson, created_at AS createdAt FROM approvals WHERE id = ?"
    )
    .get(id) as Approval | undefined;
  return row ?? null;
}

export function rejectAction(id: string): Approval | null {
  const db = getDb();
  const stmt = db.prepare("UPDATE approvals SET status = 'rejected' WHERE id = ? AND status = 'pending'");
  const result = stmt.run(id);
  if (result.changes === 0) return null;
  const row = db
    .prepare(
      "SELECT id, action_type AS actionType, room, status, payload_json AS payloadJson, created_at AS createdAt FROM approvals WHERE id = ?"
    )
    .get(id) as Approval | undefined;
  return row ?? null;
}
