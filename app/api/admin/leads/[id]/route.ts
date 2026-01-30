import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const updateSchema = z.object({
  status: z.enum(["new", "contacted"]).optional(),
  internalNotes: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });

  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lead });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};

  if (typeof data.internalNotes === "string") {
    update.internalNotes = data.internalNotes;
  }

  if (data.status) {
    update.status = data.status;
    update.contactedAt = data.status === "contacted" ? new Date() : null;
  }

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: update,
  });

  return NextResponse.json({ ok: true, lead });
}
