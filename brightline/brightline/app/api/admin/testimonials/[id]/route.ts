import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await req.json()) as {
    name?: string;
    role?: string | null;
    company?: string | null;
    quote?: string;
    projectId?: string | null;
    published?: boolean;
  };

  const testimonial = await prisma.testimonial.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      role: body.role ?? undefined,
      company: body.company ?? undefined,
      quote: body.quote ?? undefined,
      projectId: body.projectId ?? undefined,
      published:
        typeof body.published === "boolean" ? body.published : undefined,
    },
    include: { project: true },
  });

  return NextResponse.json({ ok: true, testimonial });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.testimonial.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
