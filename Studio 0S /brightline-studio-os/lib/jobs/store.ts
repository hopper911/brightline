/**
 * Bright Line Studio OS – job store (SQLite)
 *
 * Safe background jobs: summaries and reminders only.
 * No file changes, no email, no external systems.
 */

import { getDb } from "@/lib/db";
import { resolveWorkspaceId } from "@/lib/db/workspace";

export type JobStatus = "scheduled" | "running" | "completed" | "failed";

export type JobType =
  | "summarize_recent_activity"
  | "remind_pending_approvals"
  | "remind_pending_delivery_drafts"
  | "refresh_content_queue_summary"
  | "refresh_archive_summary"
  | "daily_strategy_summary"
  | "weekly_strategy_summary";

export type Job = {
  id: string;
  workspaceId: string;
  jobType: string;
  status: JobStatus;
  scheduledFor: string;
  lastRunAt: string | null;
  resultSummary: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
};

function nextId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    workspaceId: (row.workspaceId ?? row.workspace_id) as string,
    jobType: (row.jobType ?? row.job_type) as string,
    status: (row.status ?? "scheduled") as JobStatus,
    scheduledFor: (row.scheduledFor ?? row.scheduled_for) as string,
    lastRunAt: (row.lastRunAt ?? row.last_run_at) as string | null,
    resultSummary: (row.resultSummary ?? row.result_summary) as string | null,
    projectId: (row.projectId ?? row.project_id) as string | null,
    createdAt: (row.createdAt ?? row.created_at) as string,
    updatedAt: (row.updatedAt ?? row.updated_at) as string,
  };
}

export type CreateJobInput = {
  jobType: JobType;
  scheduledFor: string;
  projectId?: string | null;
  workspaceId?: string;
};

export function createJob(input: CreateJobInput): Job {
  const id = nextId();
  const now = new Date().toISOString();
  const db = getDb();
  const wsId = resolveWorkspaceId(input.workspaceId);
  const stmt = db.prepare(
    `INSERT INTO jobs (id, workspace_id, job_type, status, scheduled_for, project_id, created_at, updated_at)
     VALUES (?, ?, ?, 'scheduled', ?, ?, ?, ?)`
  );
  stmt.run(id, wsId, input.jobType, input.scheduledFor, input.projectId ?? null, now, now);
  const row = db
    .prepare(
      "SELECT id, workspace_id AS workspaceId, job_type AS jobType, status, scheduled_for AS scheduledFor, last_run_at AS lastRunAt, result_summary AS resultSummary, project_id AS projectId, created_at AS createdAt, updated_at AS updatedAt FROM jobs WHERE workspace_id = ? AND id = ?"
    )
    .get(wsId, id) as Record<string, unknown> | undefined;
  return rowToJob(
    row ?? {
      id,
      workspaceId: wsId,
      jobType: input.jobType,
      status: "scheduled",
      scheduledFor: input.scheduledFor,
      lastRunAt: null,
      resultSummary: null,
      projectId: input.projectId ?? null,
      createdAt: now,
      updatedAt: now,
    }
  );
}

export function getJobs(filters?: { status?: JobStatus; jobType?: string; limit?: number }): Job[] {
  return getJobsForWorkspace(undefined, filters);
}

export function getJobsForWorkspace(
  workspaceId: string | undefined,
  filters?: { status?: JobStatus; jobType?: string; limit?: number }
): Job[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const conditions: string[] = ["workspace_id = ?"];
  const params: (string | number)[] = [wsId];

  if (filters?.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.jobType) {
    conditions.push("job_type = ?");
    params.push(filters.jobType);
  }

  const limit = filters?.limit ?? 100;
  const sql = `SELECT id, workspace_id AS workspaceId, job_type AS jobType, status, scheduled_for AS scheduledFor, last_run_at AS lastRunAt, result_summary AS resultSummary, project_id AS projectId, created_at AS createdAt, updated_at AS updatedAt
               FROM jobs
               WHERE ${conditions.join(" AND ")}
               ORDER BY scheduled_for DESC, created_at DESC
               LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToJob);
}

export function getJobById(id: string): Job | null {
  return getJobByIdForWorkspace(undefined, id);
}

export function getJobByIdForWorkspace(workspaceId: string | undefined, id: string): Job | null {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const row = db
    .prepare(
      "SELECT id, workspace_id AS workspaceId, job_type AS jobType, status, scheduled_for AS scheduledFor, last_run_at AS lastRunAt, result_summary AS resultSummary, project_id AS projectId, created_at AS createdAt, updated_at AS updatedAt FROM jobs WHERE workspace_id = ? AND id = ?"
    )
    .get(wsId, id) as Record<string, unknown> | undefined;
  return row ? rowToJob(row) : null;
}

export function getDueJobs(now: string): Job[] {
  return getDueJobsForWorkspace(undefined, now);
}

export function getDueJobsForWorkspace(workspaceId: string | undefined, now: string): Job[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      `SELECT id, workspace_id AS workspaceId, job_type AS jobType, status, scheduled_for AS scheduledFor, last_run_at AS lastRunAt, result_summary AS resultSummary, project_id AS projectId, created_at AS createdAt, updated_at AS updatedAt
       FROM jobs
       WHERE workspace_id = ? AND status = 'scheduled' AND scheduled_for <= ?
       ORDER BY scheduled_for ASC`
    )
    .all(wsId, now) as Record<string, unknown>[];
  return rows.map(rowToJob);
}

export function markJobRunning(id: string): Job | null {
  return markJobRunningForWorkspace(undefined, id);
}

export function markJobRunningForWorkspace(workspaceId: string | undefined, id: string): Job | null {
  const db = getDb();
  const now = new Date().toISOString();
  const wsId = resolveWorkspaceId(workspaceId);
  const stmt = db.prepare(
    "UPDATE jobs SET status = 'running', updated_at = ? WHERE workspace_id = ? AND id = ? AND status = 'scheduled'"
  );
  const result = stmt.run(now, wsId, id);
  if (result.changes === 0) return null;
  return getJobByIdForWorkspace(wsId, id);
}

export function markJobComplete(id: string, resultSummary: string): Job | null {
  return markJobCompleteForWorkspace(undefined, id, resultSummary);
}

export function markJobCompleteForWorkspace(
  workspaceId: string | undefined,
  id: string,
  resultSummary: string
): Job | null {
  const db = getDb();
  const now = new Date().toISOString();
  const wsId = resolveWorkspaceId(workspaceId);
  const stmt = db.prepare(
    "UPDATE jobs SET status = 'completed', last_run_at = ?, result_summary = ?, updated_at = ? WHERE workspace_id = ? AND id = ?"
  );
  stmt.run(now, resultSummary, now, wsId, id);
  return getJobByIdForWorkspace(wsId, id);
}

export function markJobFailed(id: string, resultSummary: string): Job | null {
  return markJobFailedForWorkspace(undefined, id, resultSummary);
}

export function markJobFailedForWorkspace(
  workspaceId: string | undefined,
  id: string,
  resultSummary: string
): Job | null {
  const db = getDb();
  const now = new Date().toISOString();
  const wsId = resolveWorkspaceId(workspaceId);
  const stmt = db.prepare(
    "UPDATE jobs SET status = 'failed', last_run_at = ?, result_summary = ?, updated_at = ? WHERE workspace_id = ? AND id = ?"
  );
  stmt.run(now, resultSummary, now, wsId, id);
  return getJobByIdForWorkspace(wsId, id);
}

/** Jobs with useful output for dashboard indicators (recent completed, actionable summaries). */
export function getRecentJobIndicators(limit = 5): Job[] {
  return getRecentJobIndicatorsForWorkspace(undefined, limit);
}

export function getRecentJobIndicatorsForWorkspace(workspaceId: string | undefined, limit = 5): Job[] {
  const db = getDb();
  const wsId = resolveWorkspaceId(workspaceId);
  const rows = db
    .prepare(
      `SELECT id, workspace_id AS workspaceId, job_type AS jobType, status, scheduled_for AS scheduledFor, last_run_at AS lastRunAt, result_summary AS resultSummary, project_id AS projectId, created_at AS createdAt, updated_at AS updatedAt
       FROM jobs
       WHERE workspace_id = ? AND status = 'completed' AND result_summary IS NOT NULL AND result_summary != ''
       ORDER BY last_run_at DESC
       LIMIT ?`
    )
    .all(wsId, limit) as Record<string, unknown>[];
  return rows.map(rowToJob);
}

export function rescheduleJob(id: string, scheduledFor: string): Job | null {
  return rescheduleJobForWorkspace(undefined, id, scheduledFor);
}

export function rescheduleJobForWorkspace(
  workspaceId: string | undefined,
  id: string,
  scheduledFor: string
): Job | null {
  const db = getDb();
  const now = new Date().toISOString();
  const wsId = resolveWorkspaceId(workspaceId);
  const stmt = db.prepare(
    "UPDATE jobs SET status = 'scheduled', scheduled_for = ?, updated_at = ? WHERE workspace_id = ? AND id = ?"
  );
  stmt.run(scheduledFor, now, wsId, id);
  return getJobByIdForWorkspace(wsId, id);
}
