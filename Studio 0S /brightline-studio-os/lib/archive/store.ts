/**
 * Bright Line Studio OS – archive store (SQLite)
 *
 * Read-only. Search projects, drafts, events. No destructive actions.
 */

import { getDb } from "@/lib/db";
import type { Project } from "@/lib/projects/store";

export type ArchiveProject = Project & {
  year: string | null;
  folderPath: string | null;
  deliveryState: string | null;
  contentState: string | null;
};

export type ArchiveSearchParams = {
  q?: string;
  client?: string;
  type?: string;
  location?: string;
  year?: string;
  limit?: number;
};

function extractYear(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})/);
  return m ? m[1] : null;
}

function rowToArchiveProject(row: Record<string, unknown>): ArchiveProject {
  const base: Project = {
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
    updatedAt: (row.updatedAt as string) ?? (row.createdAt as string),
  };
  const shootDate = base.shootDate;
  const created = base.createdAt;
  const year = extractYear(shootDate) ?? extractYear(created);
  return {
    ...base,
    year,
    folderPath: (row.folderPath ?? row.folder_path ?? null) as string | null,
    deliveryState: (row.deliveryState ?? row.delivery_state ?? base.status) as string | null,
    contentState: (row.contentState ?? row.content_state ?? null) as string | null,
  };
}

export function searchArchive(params: ArchiveSearchParams): ArchiveProject[] {
  const db = getDb();
  const limit = params.limit ?? 50;
  const conditions: string[] = ["1=1"];
  const values: (string | number)[] = [];

  if (params.q?.trim()) {
    conditions.push(
      "(p.name LIKE ? OR p.client LIKE ? OR p.notes LIKE ? OR p.type LIKE ? OR p.location LIKE ?)"
    );
    const like = `%${params.q.trim()}%`;
    values.push(like, like, like, like, like);
  }
  if (params.client) {
    conditions.push("p.client = ?");
    values.push(params.client);
  }
  if (params.type) {
    conditions.push("p.type = ?");
    values.push(params.type);
  }
  if (params.location) {
    conditions.push("p.location LIKE ?");
    values.push(`%${params.location}%`);
  }
  if (params.year) {
    conditions.push(
      "(strftime('%Y', p.shoot_date) = ? OR strftime('%Y', p.created_at) = ?)"
    );
    values.push(params.year, params.year);
  }

  const sql = `
    SELECT p.id, p.name, p.client, p.type, p.location, p.shoot_date AS shootDate,
           p.status, p.notes, p.deliverables, p.visual_direction AS visualDirection,
           p.checklist, p.folder_path AS folderPath, p.delivery_state AS deliveryState,
           p.content_state AS contentState, p.created_at AS createdAt, p.updated_at AS updatedAt
    FROM projects p
    WHERE ${conditions.join(" AND ")}
    ORDER BY p.updated_at DESC, p.created_at DESC
    LIMIT ?
  `;
  values.push(limit);

  const rows = db.prepare(sql).all(...values) as Record<string, unknown>[];
  return rows.map(rowToArchiveProject);
}

export function getArchiveFilters(): {
  clients: string[];
  types: string[];
  locations: string[];
  years: string[];
} {
  const db = getDb();
  const clients = (db.prepare("SELECT DISTINCT client FROM projects WHERE client IS NOT NULL AND client != '' ORDER BY client").all() as { client: string }[])
    .map((r) => r.client);
  const types = (db.prepare("SELECT DISTINCT type FROM projects WHERE type IS NOT NULL AND type != '' ORDER BY type").all() as { type: string }[])
    .map((r) => r.type);
  const locations = (db.prepare("SELECT DISTINCT location FROM projects WHERE location IS NOT NULL AND location != '' ORDER BY location").all() as { location: string }[])
    .map((r) => r.location);

  const yearRows = db.prepare(`
    SELECT DISTINCT strftime('%Y', shoot_date) AS y FROM projects WHERE shoot_date IS NOT NULL AND shoot_date != ''
    UNION
    SELECT DISTINCT strftime('%Y', created_at) AS y FROM projects WHERE created_at IS NOT NULL
    ORDER BY y DESC
  `).all() as { y: string }[];
  const years = yearRows.map((r) => r.y).filter((y): y is string => !!y);

  return { clients, types, locations, years };
}

export function getArchiveProject(id: string): ArchiveProject | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, client, type, location, shoot_date AS shootDate,
              status, notes, deliverables, visual_direction AS visualDirection,
              checklist, folder_path AS folderPath, delivery_state AS deliveryState,
              content_state AS contentState, created_at AS createdAt, updated_at AS updatedAt
       FROM projects WHERE id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToArchiveProject(row) : null;
}

export function getRecentProjects(limit = 10): ArchiveProject[] {
  return searchArchive({ limit });
}

export function getRepeatClients(minProjects = 2): { client: string; count: number }[] {
  const db = getDb();
  return db.prepare(
    `SELECT client, COUNT(*) AS count FROM projects
     WHERE client IS NOT NULL AND client != ''
     GROUP BY client HAVING count >= ?
     ORDER BY count DESC`
  ).all(minProjects) as { client: string; count: number }[];
}

export function getProjectsByLocation(location: string): ArchiveProject[] {
  return searchArchive({ location, limit: 20 });
}
