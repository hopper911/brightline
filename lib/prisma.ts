import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function prismaLog(): Array<"query" | "info" | "warn" | "error"> {
  const mode = process.env.PRISMA_LOG?.trim().toLowerCase();
  if (mode === "none" || mode === "silent" || mode === "false" || mode === "0") {
    return [];
  }
  return process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error"];
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLog(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
