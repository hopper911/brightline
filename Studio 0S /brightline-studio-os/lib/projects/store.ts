/**
 * Bright Line Studio OS – project store (SQLite)
 *
 * CRUD for projects. Used by Production, Marketing, and handoffs.
 */

import { getDb } from "@/lib/db";

export type Project = {
  id: string;
  name: string;
  client: string | null;
  type: string | null;
  location: string | null;
  shootDate: string | null;
  status: string | null;
  notes: string | null;
  deliverables: string | null;
  visualDirection: string | null;
  checklist: string | null;
  createdAt: string;
  updatedAt: string;
};

export { PROJECT_STATUSES, type ProjectStatus } from "./constants";

export type CreateProjectInput = {
  name: string;
  client?: string | null;
  type?: string | null;
  location?: string | null;
  shootDate?: string | null;
  status?: string | null;
  notes?: string | null;
  deliverables?: string | null;
  visualDirection?: string | null;
  checklist?: string | null;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

function nextId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    client: (row.client as string | null) ?? null,
    type: (row.type as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    shootDate: (row.shootDate as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    deliverables: (row.deliverables as string | null) ?? null,
    visualDirection: (row.visualDirection as string | null) ?? null,
    checklist: (row.checklist as string | null) ?? null,
    createdAt: row.createdAt as string,
    updatedAt: (row.updatedAt as string) ?? row.createdAt as string,
  };
}

export function createProject(input: CreateProjectInput): Project {
  const id = nextId();
  const now = new Date().toISOString();
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO projects (id, name, client, type, location, shoot_date, status, notes, deliverables, visual_direction, checklist, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    id,
    input.name.trim(),
    input.client ?? null,
    input.type ?? null,
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
  return getProject(id)!;
}

export function getProject(id: string): Project | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, client, type, location, shoot_date AS shootDate, status, notes, deliverables, visual_direction AS visualDirection, checklist, created_at AS createdAt, updated_at AS updatedAt
       FROM projects WHERE id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToProject(row) : null;
}

export function listProjects(): Project[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, client, type, location, shoot_date AS shootDate, status, notes, deliverables, visual_direction AS visualDirection, checklist, created_at AS createdAt, updated_at AS updatedAt
       FROM projects ORDER BY updated_at DESC, created_at DESC`
    )
    .all() as Record<string, unknown>[];
  return rows.map(rowToProject);
}

export function updateProject(id: string, input: UpdateProjectInput): Project | null {
  const existing = getProject(id);
  if (!existing) return null;
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `UPDATE projects SET
       name = COALESCE(?, name),
       client = ?,
       type = ?,
       location = ?,
       shoot_date = ?,
       status = COALESCE(?, status),
       notes = ?,
       deliverables = ?,
       visual_direction = ?,
       checklist = ?,
       updated_at = ?
     WHERE id = ?`
  );
  stmt.run(
    input.name !== undefined ? input.name.trim() : existing.name,
    input.client !== undefined ? input.client : existing.client,
    input.type !== undefined ? input.type : existing.type,
    input.location !== undefined ? input.location : existing.location,
    input.shootDate !== undefined ? input.shootDate : existing.shootDate,
    input.status !== undefined ? input.status : existing.status,
    input.notes !== undefined ? input.notes : existing.notes,
    input.deliverables !== undefined ? input.deliverables : existing.deliverables,
    input.visualDirection !== undefined ? input.visualDirection : existing.visualDirection,
    input.checklist !== undefined ? input.checklist : existing.checklist,
    now,
    id
  );
  return getProject(id);
}
