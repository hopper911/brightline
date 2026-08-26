import { prisma } from "@/lib/prisma";

const DEFAULT_TTL_DAYS = 180;

export function finalPackageTtlDays(): number {
  const raw = process.env.FINAL_PACKAGE_TTL_DAYS?.trim();
  const n = raw ? Number(raw) : DEFAULT_TTL_DAYS;
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 3650) : DEFAULT_TTL_DAYS;
}

export function finalPackageExpiresAtFromNow(): Date {
  return new Date(Date.now() + finalPackageTtlDays() * 24 * 60 * 60_000);
}

export async function findValidFinalPackageProject(token: string) {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length < 16) return null;
  const project = await prisma.workProject.findUnique({
    where: { finalPackageToken: trimmed },
  });
  if (!project) return null;
  if (project.finalPackageExpiresAt && project.finalPackageExpiresAt.getTime() < Date.now()) {
    return null;
  }
  return project;
}
