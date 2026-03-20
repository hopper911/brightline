import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type AssistMode = "off" | "suggest" | "assist";

export type RoomSetting = {
  id: string;
  workspaceId: string;
  room: string;
  projectId: string | null;
  assistMode: AssistMode;
  updatedAt: string;
};

function nextId(): string {
  return `roomset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rowToRoomSetting(row: Record<string, unknown>): RoomSetting {
  return {
    id: row.id as string,
    workspaceId: row.workspaceId as string,
    room: row.room as string,
    projectId: (row.projectId as string | null) ?? null,
    assistMode: (row.assistMode as AssistMode) ?? "off",
    updatedAt: row.updatedAt as string,
  };
}

export function getRoomAssistMode(room: string, projectId?: string | null): AssistMode {
  return getRoomAssistModeForWorkspace(undefined, room, projectId);
}

export function getRoomAssistModeForWorkspace(
  workspaceId: string | undefined,
  room: string,
  projectId?: string | null
): AssistMode {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);

  const row = db
    .prepare(
      `SELECT id, workspace_id AS workspaceId, room, project_id AS projectId, assist_mode AS assistMode, updated_at AS updatedAt
       FROM room_settings
       WHERE workspace_id = ? AND room = ? AND project_id IS ?
       LIMIT 1`
    )
    .get(wsId, room, projectId ?? null) as Record<string, unknown> | undefined;

  if (row) return rowToRoomSetting(row).assistMode;

  if (projectId != null) {
    const fallback = db
      .prepare(
        `SELECT id, workspace_id AS workspaceId, room, project_id AS projectId, assist_mode AS assistMode, updated_at AS updatedAt
         FROM room_settings
         WHERE workspace_id = ? AND room = ? AND project_id IS NULL
         LIMIT 1`
      )
      .get(wsId, room) as Record<string, unknown> | undefined;
    if (fallback) return rowToRoomSetting(fallback).assistMode;
  }

  return "off";
}

export function setRoomAssistMode(params: {
  workspaceId?: string;
  room: string;
  projectId?: string | null;
  assistMode: AssistMode;
}): RoomSetting {
  return setRoomAssistModeForWorkspace(params.workspaceId, {
    room: params.room,
    projectId: params.projectId,
    assistMode: params.assistMode,
  });
}

export function setRoomAssistModeForWorkspace(
  workspaceId: string | undefined,
  params: {
    room: string;
    projectId?: string | null;
    assistMode: AssistMode;
  }
): RoomSetting {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const now = new Date().toISOString();
  const projectId = params.projectId ?? null;

  const existing = db
    .prepare(
      `SELECT id, workspace_id AS workspaceId, room, project_id AS projectId, assist_mode AS assistMode, updated_at AS updatedAt
       FROM room_settings
       WHERE workspace_id = ? AND room = ? AND project_id IS ?
       LIMIT 1`
    )
    .get(wsId, params.room, projectId) as Record<string, unknown> | undefined;

  if (existing) {
    db.prepare(
      `UPDATE room_settings SET assist_mode = ?, updated_at = ? WHERE id = ?`
    ).run(params.assistMode, now, existing.id);
    const updated = db
      .prepare(
        `SELECT id, workspace_id AS workspaceId, room, project_id AS projectId, assist_mode AS assistMode, updated_at AS updatedAt
         FROM room_settings
         WHERE id = ?`
      )
      .get(existing.id) as Record<string, unknown>;
    return rowToRoomSetting(updated);
  }

  const id = nextId();
  db.prepare(
    `INSERT INTO room_settings (id, workspace_id, room, project_id, assist_mode, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, wsId, params.room, projectId, params.assistMode, now);

  return {
    id,
    workspaceId: wsId,
    room: params.room,
    projectId,
    assistMode: params.assistMode,
    updatedAt: now,
  };
}

