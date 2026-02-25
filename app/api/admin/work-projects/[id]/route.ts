import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await req.json()) as {
    published?: boolean;
    isFeatured?: boolean;
    sortOrder?: number;
  };

  const project = await prisma.workProject.update({
    where: { id },
    data: {
      published:
        typeof body.published === "boolean" ? body.published : undefined,
      isFeatured:
        typeof body.isFeatured === "boolean" ? body.isFeatured : undefined,
      sortOrder:
        typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    },
    include: { heroMedia: true },
  });

  return NextResponse.json({ ok: true, project });
}
