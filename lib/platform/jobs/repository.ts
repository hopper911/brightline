import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { JobPayload, JobRecord, JobStatus } from "@/lib/platform/jobs/types";
import { findPlatformTenantBySlug } from "@/lib/platform/tenants/repository";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type InsertPlatformJobInput = {
  tenantSlug: TenantSlug;
  type: string;
  status: JobStatus;
  payload: JobPayload;
  attempts?: number;
  idempotencyKey?: string | null;
  errorSummary?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
};

export type UpdatePlatformJobInput = {
  status?: JobStatus;
  payload?: JobPayload;
  attempts?: number;
  errorSummary?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
};

function rowToJobRecord(row: {
  id: string;
  tenantSlug: string;
  type: string;
  status: string;
  payload: Prisma.JsonValue;
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
        ? (row.payload as JobPayload)
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

export async function insertPlatformJob(
  input: InsertPlatformJobInput,
  client: PrismaClient = prisma
): Promise<JobRecord> {
  const tenantRow = await findPlatformTenantBySlug(input.tenantSlug, client);
  const row = await client.platformJob.create({
    data: {
      tenantId: tenantRow?.id ?? null,
      tenantSlug: input.tenantSlug,
      type: input.type,
      status: input.status,
      payload: input.payload as Prisma.InputJsonValue,
      attempts: input.attempts ?? 0,
      idempotencyKey: input.idempotencyKey ?? null,
      errorSummary: input.errorSummary ?? null,
      startedAt: input.startedAt ?? null,
      completedAt: input.completedAt ?? null,
      failedAt: input.failedAt ?? null,
    },
  });
  return rowToJobRecord(row);
}

export async function findPlatformJobById(
  id: string,
  client: PrismaClient = prisma
): Promise<JobRecord | null> {
  const row = await client.platformJob.findUnique({ where: { id } });
  return row ? rowToJobRecord(row) : null;
}

export async function findPlatformJobByIdempotencyKey(
  idempotencyKey: string,
  client: PrismaClient = prisma
): Promise<JobRecord | null> {
  const row = await client.platformJob.findUnique({ where: { idempotencyKey } });
  return row ? rowToJobRecord(row) : null;
}

export async function updatePlatformJob(
  id: string,
  patch: UpdatePlatformJobInput,
  client: PrismaClient = prisma
): Promise<JobRecord | null> {
  try {
    const row = await client.platformJob.update({
      where: { id },
      data: {
        status: patch.status,
        payload: patch.payload ? (patch.payload as Prisma.InputJsonValue) : undefined,
        attempts: patch.attempts,
        errorSummary: patch.errorSummary,
        startedAt: patch.startedAt,
        completedAt: patch.completedAt,
        failedAt: patch.failedAt,
      },
    });
    return rowToJobRecord(row);
  } catch {
    return null;
  }
}
