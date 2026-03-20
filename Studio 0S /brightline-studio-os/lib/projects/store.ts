/**
 * Bright Line Studio OS – project store (SQLite)
 *
 * CRUD for projects. Used by Production, Marketing, and handoffs.
 */

import { getDb } from "@/lib/db";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type ProjectUrgency = "low" | "normal" | "high" | "urgent";
export type ProjectSize = "small" | "medium" | "large";

export type ProjectTimeline = Partial<{
  shootBy: string;
  deliverBy: string;
}>;

export type Project = {
  id: string;
  name: string;
  client: string | null;
  type: string | null;
  urgency: ProjectUrgency | null;
  clientType: string | null;
  stage: string | null;
  projectSize: ProjectSize | null;
  timeline: ProjectTimeline | null;
  location: string | null;
  shootDate: string | null;
  status: string | null;
  notes: string | null;
  deliverables: string | null;
  visualDirection: string | null;
  checklist: string | null;
  totalPrice: number | null;
  depositAmount: number | null;
  amountPaid: number | null;
  balanceRemaining: number | null;
  paymentStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

export { PROJECT_STATUSES, type ProjectStatus } from "./constants";

export type CreateProjectInput = {
  name: string;
  client?: string | null;
  type?: string | null;
  urgency?: ProjectUrgency | null;
  clientType?: string | null;
  stage?: string | null;
  projectSize?: ProjectSize | null;
  timeline?: ProjectTimeline | null;
  location?: string | null;
  shootDate?: string | null;
  status?: string | null;
  notes?: string | null;
  deliverables?: string | null;
  visualDirection?: string | null;
  checklist?: string | null;
  totalPrice?: number | null;
  depositAmount?: number | null;
  amountPaid?: number | null;
  balanceRemaining?: number | null;
  paymentStatus?: string | null;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

function nextId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function safeParseTimeline(value: unknown): ProjectTimeline | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const timeline: ProjectTimeline = {};
    if (typeof obj.shootBy === "string") timeline.shootBy = obj.shootBy;
    if (typeof obj.deliverBy === "string") timeline.deliverBy = obj.deliverBy;
    return Object.keys(timeline).length > 0 ? timeline : null;
  } catch {
    return null;
  }
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    client: (row.client as string | null) ?? null,
    type: (row.type as string | null) ?? null,
    urgency: (row.urgency as ProjectUrgency | null) ?? null,
    clientType: (row.clientType as string | null) ?? null,
    stage: (row.stage as string | null) ?? null,
    projectSize: (row.projectSize as ProjectSize | null) ?? null,
    timeline: safeParseTimeline(row.timelineJson),
    location: (row.location as string | null) ?? null,
    shootDate: (row.shootDate as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    deliverables: (row.deliverables as string | null) ?? null,
    visualDirection: (row.visualDirection as string | null) ?? null,
    checklist: (row.checklist as string | null) ?? null,
    totalPrice: row.totalPrice !== undefined && row.totalPrice !== null ? Number(row.totalPrice) : null,
    depositAmount: row.depositAmount !== undefined && row.depositAmount !== null ? Number(row.depositAmount) : null,
    amountPaid: row.amountPaid !== undefined && row.amountPaid !== null ? Number(row.amountPaid) : null,
    balanceRemaining:
      row.balanceRemaining !== undefined && row.balanceRemaining !== null ? Number(row.balanceRemaining) : null,
    paymentStatus: (row.paymentStatus as string | null) ?? null,
    createdAt: row.createdAt as string,
    updatedAt: (row.updatedAt as string) ?? row.createdAt as string,
  };
}

export function createProject(input: CreateProjectInput): Project {
  assertNotDemoMode("Creating projects");
  return createProjectForWorkspace(undefined, input);
}

export function createProjectForWorkspace(workspaceId: string | undefined, input: CreateProjectInput): Project {
  assertNotDemoMode("Creating projects");
  const id = nextId();
  const now = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const stmt = db.prepare(
    `INSERT INTO projects (id, workspace_id, name, client, type, urgency, client_type, stage, project_size, timeline_json, location, shoot_date, status, notes, deliverables, visual_direction, checklist, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    id,
    wsId,
    input.name.trim(),
    input.client ?? null,
    input.type ?? null,
    input.urgency ?? null,
    input.clientType ?? null,
    input.stage ?? null,
    input.projectSize ?? null,
    input.timeline ? JSON.stringify(input.timeline) : null,
    input.location ?? null,
    input.shootDate ?? null,
    input.status ?? "lead",
    input.notes ?? null,
    input.deliverables ?? null,
    input.visualDirection ?? null,
    input.checklist ?? null,
    now,
    now
  );
  return getProjectForWorkspace(wsId, id)!;
}

export function getProject(id: string): Project | null {
  return getProjectForWorkspace(undefined, id);
}

export function getProjectForWorkspace(workspaceId: string | undefined, id: string): Project | null {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const row = db
    .prepare(
      `SELECT id, name, client, type,
              urgency,
              client_type AS clientType,
              stage,
              project_size AS projectSize,
              timeline_json AS timelineJson,
              location,
              shoot_date AS shootDate,
              status,
              notes,
              deliverables,
              visual_direction AS visualDirection,
              checklist,
              total_price AS totalPrice,
              deposit_amount AS depositAmount,
              amount_paid AS amountPaid,
              balance_remaining AS balanceRemaining,
              payment_status AS paymentStatus,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM projects WHERE workspace_id = ? AND id = ?`
    )
    .get(wsId, id) as Record<string, unknown> | undefined;
  return row ? rowToProject(row) : null;
}

export function listProjects(): Project[] {
  return listProjectsForWorkspace(undefined);
}

export function listProjectsForWorkspace(workspaceId: string | undefined): Project[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      `SELECT id, name, client, type,
              urgency,
              client_type AS clientType,
              stage,
              project_size AS projectSize,
              timeline_json AS timelineJson,
              location,
              shoot_date AS shootDate,
              status,
              notes,
              deliverables,
              visual_direction AS visualDirection,
              checklist,
              total_price AS totalPrice,
              deposit_amount AS depositAmount,
              amount_paid AS amountPaid,
              balance_remaining AS balanceRemaining,
              payment_status AS paymentStatus,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM projects WHERE workspace_id = ? ORDER BY updated_at DESC, created_at DESC`
    )
    .all(wsId) as Record<string, unknown>[];
  return rows.map(rowToProject);
}

export function updateProject(id: string, input: UpdateProjectInput): Project | null {
  assertNotDemoMode("Updating projects");
  return updateProjectForWorkspace(undefined, id, input);
}

export function updateProjectForWorkspace(
  workspaceId: string | undefined,
  id: string,
  input: UpdateProjectInput
): Project | null {
  assertNotDemoMode("Updating projects");
  const existing = getProjectForWorkspace(workspaceId, id);
  if (!existing) return null;
  const db = getDb();
  const now = new Date().toISOString();
  const wsId = resolveWorkspaceId(workspaceId);
  const stmt = db.prepare(
    `UPDATE projects SET
       name = COALESCE(?, name),
       client = ?,
       type = ?,
       urgency = ?,
       client_type = ?,
       stage = ?,
       project_size = ?,
       timeline_json = ?,
       location = ?,
       shoot_date = ?,
       status = COALESCE(?, status),
       notes = ?,
       deliverables = ?,
       visual_direction = ?,
       checklist = ?,
       total_price = ?,
       deposit_amount = ?,
       amount_paid = ?,
       balance_remaining = ?,
       payment_status = ?,
       updated_at = ?
     WHERE workspace_id = ? AND id = ?`
  );
  stmt.run(
    input.name !== undefined ? input.name.trim() : existing.name,
    input.client !== undefined ? input.client : existing.client,
    input.type !== undefined ? input.type : existing.type,
    input.urgency !== undefined ? input.urgency : existing.urgency,
    input.clientType !== undefined ? input.clientType : existing.clientType,
    input.stage !== undefined ? input.stage : existing.stage,
    input.projectSize !== undefined ? input.projectSize : existing.projectSize,
    input.timeline !== undefined ? (input.timeline ? JSON.stringify(input.timeline) : null) : existing.timeline ? JSON.stringify(existing.timeline) : null,
    input.location !== undefined ? input.location : existing.location,
    input.shootDate !== undefined ? input.shootDate : existing.shootDate,
    input.status !== undefined ? input.status : existing.status,
    input.notes !== undefined ? input.notes : existing.notes,
    input.deliverables !== undefined ? input.deliverables : existing.deliverables,
    input.visualDirection !== undefined ? input.visualDirection : existing.visualDirection,
    input.checklist !== undefined ? input.checklist : existing.checklist,
    input.totalPrice !== undefined ? input.totalPrice : existing.totalPrice,
    input.depositAmount !== undefined ? input.depositAmount : existing.depositAmount,
    input.amountPaid !== undefined ? input.amountPaid : existing.amountPaid,
    input.balanceRemaining !== undefined ? input.balanceRemaining : existing.balanceRemaining,
    input.paymentStatus !== undefined ? input.paymentStatus : existing.paymentStatus,
    now,
    wsId,
    id
  );
  return getProjectForWorkspace(wsId, id);
}
