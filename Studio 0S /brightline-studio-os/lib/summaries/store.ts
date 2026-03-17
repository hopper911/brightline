/**
 * Bright Line Studio OS – summaries store
 *
 * Stored daily and weekly strategy summaries. Read-only output.
 */

import { getDb } from "@/lib/db";

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
  const id = nextId();
  const now = new Date().toISOString();
  const db = getDb();
  db.prepare("INSERT INTO summaries (id, type, content, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    type,
    content,
    now
  );
  const row = db
    .prepare(
      "SELECT id, type, content, created_at AS createdAt FROM summaries WHERE id = ?"
    )
    .get(id) as { id: string; type: string; content: string; createdAt: string };
  return row as Summary;
}

export function getLatestSummary(type: "daily" | "weekly"): Summary | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, type, content, created_at AS createdAt FROM summaries WHERE type = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(type) as { id: string; type: string; content: string; createdAt: string } | undefined;
  return row ? (row as Summary) : null;
}
