/**
 * Bright Line Studio OS – reminders store (SQLite, local-first)
 *
 * Reminders are safe: they do not send anything automatically.
 * They exist as scheduled tasks for the human to review/execute externally.
 */

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";

export type ReminderType = "follow-up" | "delivery" | "payment";
export type ReminderStatus = "pending" | "done" | "dismissed";

export type Reminder = {
  id: string;
  projectId: string | null;
  type: ReminderType;
  message: string;
  dueDate: string;
  status: ReminderStatus;
  createdAt: string;
};

function nextId(): string {
  return `rem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type CreateReminderInput = {
  projectId?: string | null;
  type: ReminderType;
  message: string;
  dueDate: string;
  workspaceId?: string;
};

export function createReminder(input: CreateReminderInput): Reminder {
  assertNotDemoMode("Creating reminders");
  const id = nextId();
  const createdAt = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  db.prepare(
    "INSERT INTO reminders (id, workspace_id, project_id, type, message, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, wsId, input.projectId ?? null, input.type, input.message, input.dueDate, "pending");

  return {
    id,
    projectId: input.projectId ?? null,
    type: input.type,
    message: input.message,
    dueDate: input.dueDate,
    status: "pending",
    createdAt,
  };
}

export function listReminders(params?: {
  status?: ReminderStatus;
  projectId?: string;
  limit?: number;
  workspaceId?: string;
}): Reminder[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(params?.workspaceId);
  const parts: string[] = [
    "SELECT id, project_id AS projectId, type, message, due_date AS dueDate, status, created_at AS createdAt FROM reminders WHERE workspace_id = ?",
  ];
  const args: (string | number)[] = [wsId];

  if (params?.status) {
    parts.push("AND status = ?");
    args.push(params.status);
  }
  if (params?.projectId) {
    parts.push("AND project_id = ?");
    args.push(params.projectId);
  }

  parts.push("ORDER BY due_date ASC, created_at DESC");
  if (params?.limit != null) {
    parts.push("LIMIT ?");
    args.push(params.limit);
  }

  const rows = db.prepare(parts.join(" ")).all(...args) as Reminder[];
  return rows.map((r) => ({ ...r, status: r.status as ReminderStatus, type: r.type as ReminderType }));
}

export function updateReminderStatus(id: string, status: ReminderStatus): Reminder | null {
  assertNotDemoMode("Updating reminders");
  return updateReminderStatusForWorkspace(undefined, id, status);
}

export function updateReminderStatusForWorkspace(
  workspaceId: string | undefined,
  id: string,
  status: ReminderStatus
): Reminder | null {
  assertNotDemoMode("Updating reminders");
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const result = db.prepare("UPDATE reminders SET status = ? WHERE workspace_id = ? AND id = ?").run(status, wsId, id);
  if (result.changes === 0) return null;
  const row = db
    .prepare(
      "SELECT id, project_id AS projectId, type, message, due_date AS dueDate, status, created_at AS createdAt FROM reminders WHERE workspace_id = ? AND id = ?"
    )
    .get(wsId, id) as Reminder | undefined;
  if (!row) return null;
  return { ...row, status: row.status as ReminderStatus, type: row.type as ReminderType };
}

