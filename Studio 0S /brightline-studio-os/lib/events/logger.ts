/**
 * Bright Line Studio OS – event logger
 *
 * Writes events to the SQLite events table. Used by rooms and agents
 * to record actions. Local-first; no external services.
 */

import { getDb } from "@/lib/db";

function nextId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface LogEventParams {
  room: string;
  event_type: string;
  status: string;
  summary: string;
  agent_id?: string | null;
}

export function logEvent(params: LogEventParams): string {
  const id = nextId();
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO events (id, room, agent_id, event_type, status, summary) VALUES (?, ?, ?, ?, ?, ?)"
  );
  stmt.run(
    id,
    params.room,
    params.agent_id ?? null,
    params.event_type,
    params.status,
    params.summary
  );
  return id;
}
