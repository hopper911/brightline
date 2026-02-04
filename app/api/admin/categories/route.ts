import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const categories = await prisma.portfolioCategory.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, categories });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { name?: string; slug?: string };

  if (!body.name || !body.slug) {
    return NextResponse.json(
      { ok: false, error: "Missing name or slug." },
      { status: 400 }
    );
  }

  const category = await prisma.portfolioCategory.create({
    data: {
      name: body.name,
      slug: body.slug,
    },
  });

  return NextResponse.json({ ok: true, category });
}
