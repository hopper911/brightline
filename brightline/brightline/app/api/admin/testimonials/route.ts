import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const testimonials = await prisma.testimonial.findMany({
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, testimonials });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    role?: string;
    company?: string;
    quote?: string;
    projectId?: string | null;
    published?: boolean;
  };

  if (!body.name || !body.quote) {
    return NextResponse.json(
      { ok: false, error: "Name and quote are required." },
      { status: 400 }
    );
  }

  const testimonial = await prisma.testimonial.create({
    data: {
      name: body.name,
      role: body.role || null,
      company: body.company || null,
      quote: body.quote,
      projectId: body.projectId || null,
      published: body.published ?? true,
    },
    include: { project: true },
  });

  return NextResponse.json({ ok: true, testimonial });
}
