import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight list for Studio OS project pickers (e.g. gallery ↔ CMS link). */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const projects = await prisma.studioProject.findMany({
    orderBy: { updatedAt: "desc" },
    take: 400,
    select: {
      id: true,
      title: true,
      slug: true,
      client: true,
    },
  });

  return NextResponse.json({ ok: true, projects });
}
