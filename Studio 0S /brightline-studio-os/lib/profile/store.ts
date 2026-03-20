import "server-only";

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type PhotographyType = "architecture" | "real_estate" | "corporate" | "events" | "mixed";
export type MainGoal = "get_more_clients" | "streamline_workflow" | "scale_business";

export type WorkspaceProfile = {
  workspaceId: string;
  photographyType: PhotographyType | null;
  servicesOffered: string[];
  mainLocation: string | null;
  mainGoal: MainGoal | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertWorkspaceProfileInput = {
  photographyType: PhotographyType;
  servicesOffered: string[];
  mainLocation: string;
  mainGoal: MainGoal;
  workspaceId?: string;
};

function safeParseStringArray(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

function safeParseMainGoal(value: unknown): MainGoal | null {
  if (value === "get_more_clients" || value === "streamline_workflow" || value === "scale_business") return value;
  return null;
}

function safeParsePhotoType(value: unknown): PhotographyType | null {
  if (value === "architecture" || value === "real_estate" || value === "corporate" || value === "events" || value === "mixed") {
    return value;
  }
  return null;
}

function rowToProfile(row: Record<string, unknown>): WorkspaceProfile {
  const goals = safeParseStringArray(row.goalsJson);
  return {
    workspaceId: row.workspaceId as string,
    photographyType: safeParsePhotoType(row.businessType),
    servicesOffered: safeParseStringArray(row.servicesJson),
    mainLocation: (row.mainLocation as string | null) ?? null,
    mainGoal: safeParseMainGoal(goals[0]),
    createdAt: row.createdAt as string,
    updatedAt: (row.updatedAt as string) ?? (row.createdAt as string),
  };
}

export function getWorkspaceProfile(workspaceId?: string): WorkspaceProfile | null {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const row = db
    .prepare(
      `SELECT workspace_id AS workspaceId,
              business_type AS businessType,
              services_offered_json AS servicesJson,
              main_location AS mainLocation,
              goals_json AS goalsJson,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM workspace_profile
       WHERE workspace_id = ?
       LIMIT 1`
    )
    .get(wsId) as Record<string, unknown> | undefined;
  return row ? rowToProfile(row) : null;
}

export function hasWorkspaceProfile(workspaceId?: string): boolean {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const row = db
    .prepare("SELECT workspace_id AS workspaceId FROM workspace_profile WHERE workspace_id = ? LIMIT 1")
    .get(wsId) as { workspaceId: string } | undefined;
  return Boolean(row?.workspaceId);
}

export function upsertWorkspaceProfile(input: UpsertWorkspaceProfileInput): WorkspaceProfile {
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  const now = new Date().toISOString();

  const services = input.servicesOffered.map((s) => s.trim()).filter(Boolean);
  const goalsJson = JSON.stringify([input.mainGoal]);
  const servicesJson = JSON.stringify(services);

  db.prepare(
    `INSERT INTO workspace_profile
      (workspace_id, business_type, services_offered_json, main_location, goals_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id) DO UPDATE SET
       business_type = excluded.business_type,
       services_offered_json = excluded.services_offered_json,
       main_location = excluded.main_location,
       goals_json = excluded.goals_json,
       updated_at = excluded.updated_at`
  ).run(wsId, input.photographyType, servicesJson, input.mainLocation.trim(), goalsJson, now, now);

  return getWorkspaceProfile(wsId)!;
}

export function getWorkspaceProfileContextString(profile: WorkspaceProfile | null): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.photographyType) parts.push(`Photography type: ${profile.photographyType.replace(/_/g, " ")}`);
  if (profile.mainLocation) parts.push(`Location: ${profile.mainLocation}`);
  if (profile.mainGoal) parts.push(`Primary goal: ${profile.mainGoal.replace(/_/g, " ")}`);
  if (profile.servicesOffered.length > 0) parts.push(`Services offered: ${profile.servicesOffered.slice(0, 8).join(", ")}`);
  return parts.join(". ");
}

