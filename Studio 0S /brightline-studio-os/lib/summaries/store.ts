/**
 * Bright Line Studio OS – summaries store
 *
 * Stored daily and weekly strategy summaries. Read-only output.
 */

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type Summary = {
  id: string;
  type: "daily" | "weekly";
  content: string;
  createdAt: string;
};

function nextId(): string {
  return `sum-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSummary(type: "daily" | "weekly", content: string): Summary {
  return createSummaryForWorkspace(undefined, type, content);
}

export function createSummaryForWorkspace(
  workspaceId: string | undefined,
  type: "daily" | "weekly",
  content: string
): Summary {
  const id = nextId();
  const now = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  db.prepare("INSERT INTO summaries (id, workspace_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    wsId,
    type,
    content,
    now
  );
  const row = db
    .prepare(
      "SELECT id, type, content, created_at AS createdAt FROM summaries WHERE workspace_id = ? AND id = ?"
    )
    .get(wsId, id) as { id: string; type: string; content: string; createdAt: string };
  return row as Summary;
}

export function getLatestSummary(type: "daily" | "weekly"): Summary | null {
  return getLatestSummaryForWorkspace(undefined, type);
}

export function getLatestSummaryForWorkspace(
  workspaceId: string | undefined,
  type: "daily" | "weekly"
): Summary | null {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const row = db
    .prepare(
      "SELECT id, type, content, created_at AS createdAt FROM summaries WHERE workspace_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(wsId, type) as { id: string; type: string; content: string; createdAt: string } | undefined;
  return row ? (row as Summary) : null;
}
