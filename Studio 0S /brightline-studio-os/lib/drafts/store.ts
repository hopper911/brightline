/**
 * Bright Line Studio OS – draft store (SQLite)
 *
 * Persists drafts to data/studio.db.
 */

import { getDb } from "@/lib/db";

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
};

export function saveDraft(input: SaveDraftInput): Draft {
  const id = nextId();
  const createdAt = new Date().toISOString();
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO drafts (id, project_id, room, draft_type, content) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(id, input.projectId ?? null, input.room, input.type, input.content);
  return { id, createdAt, projectId: input.projectId, ...input };
}

export function getDrafts(room?: string, projectId?: string): Draft[] {
  const db = getDb();
  let sql =
    "SELECT id, project_id AS projectId, room, draft_type AS type, content, created_at AS createdAt FROM drafts WHERE 1=1";
  const params: (string | null)[] = [];
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
