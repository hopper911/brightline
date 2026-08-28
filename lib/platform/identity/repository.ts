import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  PlatformMembershipRecord,
  PlatformMembershipRole,
  PlatformUserRecord,
  PlatformUserStatus,
} from "@/lib/platform/identity/types";
import { normalizePlatformEmail } from "@/lib/platform/identity/types";
import { findPlatformTenantBySlug } from "@/lib/platform/tenants/repository";
import type { TenantSlug } from "@/lib/platform/tenants/types";

function rowToUser(row: {
  id: string;
  email: string | null;
  name: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): PlatformUserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status as PlatformUserStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function findPlatformUserById(
  userId: string,
  client: PrismaClient = prisma
): Promise<PlatformUserRecord | null> {
  const row = await client.platformUser.findUnique({ where: { id: userId } });
  return row ? rowToUser(row) : null;
}

export async function findPlatformUserByEmail(
  email: string,
  client: PrismaClient = prisma
): Promise<PlatformUserRecord | null> {
  const normalized = normalizePlatformEmail(email);
  if (!normalized) return null;
  const row = await client.platformUser.findUnique({ where: { email: normalized } });
  return row ? rowToUser(row) : null;
}

export async function findPlatformUserByLegacyLink(
  legacyKind: string,
  legacyRefId: string | null,
  client: PrismaClient = prisma
): Promise<PlatformUserRecord | null> {
  const link = await client.platformLegacyIdentityLink.findUnique({
    where: {
      legacyKind_legacyRefId: {
        legacyKind,
        legacyRefId,
      },
    },
    include: { user: true },
  });
  return link?.user ? rowToUser(link.user) : null;
}

export async function listPlatformMembershipsForUser(
  userId: string,
  client: PrismaClient = prisma
): Promise<PlatformMembershipRecord[]> {
  const rows = await client.platformMembership.findMany({
    where: { userId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    tenantSlug: row.tenant.slug as TenantSlug,
    role: row.role as PlatformMembershipRole,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function listPlatformMembershipsForUserInTenant(
  userId: string,
  tenantSlug: TenantSlug,
  client: PrismaClient = prisma
): Promise<PlatformMembershipRecord[]> {
  const tenant = await findPlatformTenantBySlug(tenantSlug, client);
  if (!tenant) return [];

  const rows = await client.platformMembership.findMany({
    where: { userId, tenantId: tenant.id },
    include: { tenant: true },
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    tenantSlug: row.tenant.slug as TenantSlug,
    role: row.role as PlatformMembershipRole,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function createPlatformUser(
  input: {
    email?: string | null;
    name?: string | null;
    status?: PlatformUserStatus;
  },
  client: PrismaClient = prisma
): Promise<PlatformUserRecord> {
  const email =
    input.email && input.email.trim() ? normalizePlatformEmail(input.email) : null;
  const row = await client.platformUser.create({
    data: {
      email,
      name: input.name?.trim() || null,
      status: input.status ?? "ACTIVE",
    },
  });
  return rowToUser(row);
}

export async function upsertPlatformMembership(
  input: {
    userId: string;
    tenantSlug: TenantSlug;
    role: PlatformMembershipRole;
  },
  client: PrismaClient = prisma
): Promise<PlatformMembershipRecord | null> {
  const tenant = await findPlatformTenantBySlug(input.tenantSlug, client);
  if (!tenant) return null;

  const row = await client.platformMembership.upsert({
    where: {
      userId_tenantId: {
        userId: input.userId,
        tenantId: tenant.id,
      },
    },
    create: {
      userId: input.userId,
      tenantId: tenant.id,
      role: input.role,
    },
    update: {
      role: input.role,
    },
    include: { tenant: true },
  });

  return {
    id: row.id,
    userId: row.userId,
    tenantSlug: row.tenant.slug as TenantSlug,
    role: row.role as PlatformMembershipRole,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createPlatformLegacyIdentityLink(
  input: {
    userId: string;
    legacyKind: string;
    legacyRefId: string | null;
  },
  client: PrismaClient = prisma
): Promise<boolean> {
  try {
    await client.platformLegacyIdentityLink.create({
      data: {
        userId: input.userId,
        legacyKind: input.legacyKind,
        legacyRefId: input.legacyRefId,
      },
    });
    return true;
  } catch {
    return false;
  }
}
