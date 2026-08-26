import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  if (!clientId) return NextResponse.json({ ok: false, error: "clientId required" }, { status: 400 });
  const projects = await prisma.studioProject.findMany({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
    take: 100,
  });
  return NextResponse.json({ ok: true, projects });
}
