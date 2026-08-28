import type { PrismaClient } from "@prisma/client";

/**
 * True when a public table column exists.
 * Uses pg_catalog (Prisma quoted identifiers) — information_schema case rules are unreliable.
 */
export async function tableHasColumn(
  client: PrismaClient,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const rows = await client.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute a
      INNER JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      INNER JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ${tableName}
        AND a.attname = ${columnName}
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

/** Safe hostname hint for operator logs — never prints credentials. */
export function databaseUrlHostHint(databaseUrl: string | undefined): string {
  if (!databaseUrl?.trim()) return "(DATABASE_URL unset)";
  try {
    return new URL(databaseUrl).host;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}
