import "server-only";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth/auth";

export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceContext = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

const COOKIE_WORKSPACE = "bl_workspace_id";
const COOKIE_USER = "bl_user_id";

function nextWorkspaceId(): string {
  return `ws-${randomUUID()}`;
}

function nextUserId(): string {
  return `usr-${randomUUID()}`;
}

function normalizeRole(value: unknown): WorkspaceRole {
  if (value === "owner" || value === "admin" || value === "member") return value;
  return "member";
}

async function readCookieIds(): Promise<{ workspaceId: string | null; userId: string | null }> {
  const jar = await cookies();
  const workspaceId = jar.get(COOKIE_WORKSPACE)?.value ?? null;
  const userId = jar.get(COOKIE_USER)?.value ?? null;
  return { workspaceId, userId };
}

async function setCookieIds(params: { workspaceId: string; userId: string }): Promise<void> {
  const jar = await cookies();
  const base = { httpOnly: true, sameSite: "lax" as const, path: "/" };
  jar.set(COOKIE_WORKSPACE, params.workspaceId, base);
  jar.set(COOKIE_USER, params.userId, base);
}

function ensureBootstrapWorkspaceAndUser(): WorkspaceContext {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db
    .prepare(
      "SELECT w.id AS workspaceId, w.owner_id AS ownerId, u.role AS role FROM workspaces w LEFT JOIN users u ON u.id = w.owner_id ORDER BY w.created_at ASC LIMIT 1"
    )
    .get() as { workspaceId: string; ownerId: string; role: string } | undefined;

  if (existing?.workspaceId && existing?.ownerId) {
    return { workspaceId: existing.workspaceId, userId: existing.ownerId, role: normalizeRole(existing.role) };
  }

  const workspaceId = nextWorkspaceId();
  const userId = nextUserId();

  db.prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)")
    .run(workspaceId, "Default Workspace", userId, now);

  db.prepare("INSERT INTO users (id, email, role, workspace_id, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(userId, "owner@local", "owner", workspaceId, now);

  try {
    db.prepare(
      "INSERT OR IGNORE INTO workspace_settings (workspace_id, ai_mode, created_at, updated_at) VALUES (?, 'local', ?, ?)"
    ).run(workspaceId, now, now);
  } catch {
    /* ignore */
  }

  try {
    db.prepare(
      "INSERT OR IGNORE INTO plan_limits (workspace_id, plan, max_projects, max_drafts, max_active_automations, created_at, updated_at) VALUES (?, 'free', 10, 200, 3, ?, ?)"
    ).run(workspaceId, now, now);
  } catch {
    /* ignore */
  }

  return { workspaceId, userId, role: "owner" };
}

function validateContextFromDb(params: { workspaceId: string; userId: string }): WorkspaceContext | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, role, workspace_id AS workspaceId FROM users WHERE id = ? LIMIT 1")
    .get(params.userId) as { id: string; role: string; workspaceId: string } | undefined;

  if (!row?.id) return null;
  if (row.workspaceId !== params.workspaceId) return null;

  return { workspaceId: params.workspaceId, userId: params.userId, role: normalizeRole(row.role) };
}

/**
 * Returns the active workspace context, creating a default workspace/user and
 * setting cookies if none exist.
 */
export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const session = await auth();
  const sessionUser = session?.user;
  if (sessionUser?.id && sessionUser.workspaceId) {
    const ctx: WorkspaceContext = {
      workspaceId: sessionUser.workspaceId,
      userId: sessionUser.id,
      role: normalizeRole(sessionUser.role),
    };
    await setCookieIds({ workspaceId: ctx.workspaceId, userId: ctx.userId });
    return ctx;
  }

  const { workspaceId, userId } = await readCookieIds();
  if (workspaceId && userId) {
    const ctx = validateContextFromDb({ workspaceId, userId });
    if (ctx) return ctx;
  }

  const boot = ensureBootstrapWorkspaceAndUser();
  return boot;
}

/**
 * Explicitly re-selects (or initializes) workspace context and sets cookies.
 * Useful for onboarding flows where you want to guarantee identity exists.
 */
export async function ensureWorkspaceContextCookies(): Promise<WorkspaceContext> {
  const ctx = await requireWorkspaceContext();
  await setCookieIds({ workspaceId: ctx.workspaceId, userId: ctx.userId });
  return ctx;
}

