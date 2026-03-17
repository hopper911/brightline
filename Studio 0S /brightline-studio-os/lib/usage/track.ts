import "server-only";

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type UsageEventType = "agent_usage" | "drafts_generated" | "workflows_triggered";

export type TrackUsageParams = {
  workspaceId?: string;
  userId?: string;
  eventType: UsageEventType;
  quantity?: number;
  meta?: Record<string, unknown>;
};

function resolveUserId(workspaceId: string, explicit?: string): string {
  if (explicit && explicit.trim()) return explicit;
  const db = getDb();
  const row = db
    .prepare("SELECT owner_id AS ownerId FROM workspaces WHERE id = ? LIMIT 1")
    .get(workspaceId) as { ownerId: string } | undefined;
  return row?.ownerId ?? "usr-unknown";
}

export function trackUsage(params: TrackUsageParams): void {
  const db = getDb();
  const wsId = resolveWorkspaceId(params.workspaceId);
  const userId = resolveUserId(wsId, params.userId);
  const id = `use-${randomUUID()}`;
  const qty = params.quantity ?? 1;
  const metaJson = params.meta ? JSON.stringify(params.meta) : null;

  try {
    db.prepare(
      "INSERT INTO usage_events (id, workspace_id, user_id, event_type, quantity, meta_json) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, wsId, userId, params.eventType, qty, metaJson);
  } catch {
    // Tracking must never break user workflows.
  }
}

