/**
 * DB connectivity guard. Use to skip Prisma/DB calls when DATABASE_URL
 * is missing (e.g. during CI build). Avoids Prisma errors during static generation.
 */
export function hasDatabaseUrl(): boolean {
  return !!process.env.DATABASE_URL;
}
