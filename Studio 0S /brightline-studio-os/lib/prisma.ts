/**
 * Bright Line Studio OS – Prisma client singleton
 *
 * Use this for Prisma-backed modules (CRM, Projects, etc).
 * Existing SQLite layer (lib/db) remains for legacy routes.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
