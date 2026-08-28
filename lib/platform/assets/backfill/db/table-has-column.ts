import type { PrismaClient } from "@prisma/client";

/** True when a public table column exists (handles Prisma/Postgres drift on dev DBs). */
export async function tableHasColumn(
  client: PrismaClient,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const rows = await client.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}
