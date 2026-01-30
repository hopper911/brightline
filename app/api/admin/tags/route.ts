import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, tags });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { name?: string; slug?: string };

  if (!body.name) {
    return NextResponse.json(
      { ok: false, error: "Name is required." },
      { status: 400 }
    );
  }

  const slug = body.slug?.trim() || slugify(body.name);

  const tag = await prisma.tag.create({
    data: {
      name: body.name,
      slug,
    },
  });

  return NextResponse.json({ ok: true, tag });
}
