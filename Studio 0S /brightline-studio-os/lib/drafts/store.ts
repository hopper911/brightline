/**
 * Bright Line Studio OS – draft store (SQLite)
 *
 * Persists drafts to data/studio.db.
 */

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";
import { trackUsage } from "@/lib/usage/track";

export type Draft = {
  id: string;
  type: string;
  room: string;
  content: string;
  createdAt: string;
  projectId?: string;
};

function nextId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type SaveDraftInput = {
  type: string;
  room: string;
  content: string;
  projectId?: string;
  workspaceId?: string;
  userId?: string;
};

export function saveDraft(input: SaveDraftInput): Draft {
  assertNotDemoMode("Saving drafts");
  const id = nextId();
  const createdAt = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  const stmt = db.prepare(
    "INSERT INTO drafts (id, workspace_id, project_id, room, draft_type, content) VALUES (?, ?, ?, ?, ?, ?)"
  );
  stmt.run(id, wsId, input.projectId ?? null, input.room, input.type, input.content);
  trackUsage({
    workspaceId: wsId,
    userId: input.userId,
    eventType: "drafts_generated",
    quantity: 1,
    meta: { room: input.room, draftType: input.type, projectId: input.projectId ?? null },
  });
  return { id, createdAt, projectId: input.projectId, ...input };
}

export function getDrafts(room?: string, projectId?: string): Draft[] {
  return getDraftsForWorkspace(undefined, room, projectId);
}

export function getDraftsForWorkspace(workspaceId: string | undefined, room?: string, projectId?: string): Draft[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  let sql =
    "SELECT id, workspace_id AS workspaceId, project_id AS projectId, room, draft_type AS type, content, created_at AS createdAt FROM drafts WHERE workspace_id = ?";
  const params: (string | null)[] = [];
  params.push(wsId);
  if (room) {
    sql += " AND room = ?";
    params.push(room);
  }
  if (projectId) {
    sql += " AND project_id = ?";
    params.push(projectId);
  }
  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params) as Draft[];
  return rows;
}
