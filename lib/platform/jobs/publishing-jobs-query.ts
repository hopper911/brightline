import "server-only";

import { prisma } from "@/lib/prisma";
import type { JobRecord, JobStatus } from "@/lib/platform/jobs/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

const PUBLISHING_JOB_PREFIX = "publishing.";

function rowToJobRecord(row: {
  id: string;
  tenantSlug: string;
  type: string;
  status: string;
  payload: unknown;
  attempts: number;
  idempotencyKey: string | null;
  errorSummary: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
}): JobRecord {
  return {
    id: row.id,
    tenantSlug: row.tenantSlug as TenantSlug,
    type: row.type,
    status: row.status as JobStatus,
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as JobRecord["payload"])
        : {},
    attempts: row.attempts,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    errorSummary: row.errorSummary,
  };
}

export type PublishingJobCounts = {
  pending: number;
  running: number;
  completed: number;
  failed: number;
};

export type PublishingJobListResult = {
  items: JobRecord[];
  nextCursor?: string;
  counts: PublishingJobCounts;
};

function clampLimit(limit?: number): number {
  return Math.min(Math.max(limit ?? 30, 1), 50);
}

function emptyCounts(): PublishingJobCounts {
  return { pending: 0, running: 0, completed: 0, failed: 0 };
}

export async function listPlatformPublishingJobs(input: {
  tenantSlugs: TenantSlug[];
  limit?: number;
  cursor?: string;
}): Promise<PublishingJobListResult> {
  if (!input.tenantSlugs.length) {
    return { items: [], counts: emptyCounts() };
  }

  const limit = clampLimit(input.limit);
  const tenantFilter =
    input.tenantSlugs.length === 1
      ? { tenantSlug: input.tenantSlugs[0] }
      : { tenantSlug: { in: input.tenantSlugs } };

  const [rows, groups] = await Promise.all([
    prisma.platformJob.findMany({
      where: {
        ...tenantFilter,
        type: { startsWith: PUBLISHING_JOB_PREFIX },
        ...(input.cursor ? { id: { lt: input.cursor } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    }),
    prisma.platformJob.groupBy({
      by: ["status"],
      where: {
        ...tenantFilter,
        type: { startsWith: PUBLISHING_JOB_PREFIX },
      },
      _count: { _all: true },
    }),
  ]);

  const slice = rows.slice(0, limit);
  const counts = emptyCounts();
  for (const group of groups) {
    const count = group._count._all;
    const status = group.status.toUpperCase();
    if (status === "PENDING") counts.pending = count;
    else if (status === "RUNNING") counts.running = count;
    else if (status === "COMPLETED") counts.completed = count;
    else if (status === "FAILED") counts.failed = count;
  }

  return {
    items: slice.map(rowToJobRecord),
    nextCursor: rows.length > limit ? slice[slice.length - 1]?.id : undefined,
    counts,
  };
}
