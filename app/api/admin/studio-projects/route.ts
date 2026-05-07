import { authorizeAdminRequest } from "@/lib/admin-auth";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight list for Studio OS project pickers (e.g. gallery ↔ CMS link). */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return jsonErr("Unauthorized.", 401);
  }

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const defaultLimit = 400;
  const limit = Math.min(
    Math.max(Number(limitRaw ?? defaultLimit) || defaultLimit, 1),
    500
  );
  const offset = Math.max(Number(offsetRaw ?? 0) || 0, 0);

  const rows = await prisma.studioProject.findMany({
    orderBy: { updatedAt: "desc" },
    skip: offset,
    take: limit + 1,
    select: {
      id: true,
      title: true,
      slug: true,
      client: true,
    },
  });

  const hasMore = rows.length > limit;
  const projects = hasMore ? rows.slice(0, limit) : rows;

  return jsonOk({ projects, hasMore });
}
