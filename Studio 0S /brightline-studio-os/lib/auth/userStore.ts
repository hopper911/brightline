import "server-only";

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

export type DbUser = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  workspaceId: string;
};

function nextWorkspaceId(): string {
  return `ws-${randomUUID()}`;
}

function nextUserId(): string {
  return `usr-${randomUUID()}`;
}

function normalizeRole(value: unknown): DbUser["role"] {
  if (value === "owner" || value === "admin" || value === "member") return value;
  return "member";
}

export function getOrCreateUserByEmail(email: string): DbUser {
  const db = getDb();
  const now = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = db
    .prepare("SELECT id, email, role, workspace_id AS workspaceId FROM users WHERE lower(email) = ? LIMIT 1")
    .get(normalizedEmail) as { id: string; email: string; role: string; workspaceId: string } | undefined;

  if (existing?.id) {
    return {
      id: existing.id,
      email: existing.email,
      role: normalizeRole(existing.role),
      workspaceId: existing.workspaceId,
    };
  }

  const workspaceId = nextWorkspaceId();
  const userId = nextUserId();

  db.prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)")
    .run(workspaceId, "My Studio", userId, now);
  db.prepare("INSERT INTO users (id, email, role, workspace_id, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(userId, normalizedEmail, "owner", workspaceId, now);

  db.prepare(
    "INSERT OR IGNORE INTO workspace_settings (workspace_id, ai_mode, created_at, updated_at) VALUES (?, 'local', ?, ?)"
  ).run(workspaceId, now, now);

  db.prepare(
    "INSERT OR IGNORE INTO plan_limits (workspace_id, plan, max_projects, max_drafts, max_active_automations, created_at, updated_at) VALUES (?, 'free', 10, 200, 3, ?, ?)"
  ).run(workspaceId, now, now);

  return { id: userId, email: normalizedEmail, role: "owner", workspaceId };
}

