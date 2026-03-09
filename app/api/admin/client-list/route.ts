import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, clients });
}
