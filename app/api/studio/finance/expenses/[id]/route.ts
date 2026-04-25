import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  asNullableString,
  parseDate,
  parsePositiveMoney,
} from "@/lib/studio/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const expense = await prisma.studioExpense.update({
      where: { id },
      data: {
        projectId: body.projectId === undefined ? undefined : asNullableString(body.projectId),
        amount: body.amount === undefined ? undefined : parsePositiveMoney(body.amount),
        category:
          body.category === undefined
            ? undefined
            : (asNullableString(body.category) ?? undefined),
        note: body.note === undefined ? undefined : asNullableString(body.note),
        date: body.date === undefined ? undefined : parseDate(body.date),
        receiptPath: body.receiptPath === undefined ? undefined : asNullableString(body.receiptPath),
        receiptKey: body.receiptKey === undefined ? undefined : asNullableString(body.receiptKey),
        receiptFilename:
          body.receiptFilename === undefined ? undefined : asNullableString(body.receiptFilename),
        receiptContentType:
          body.receiptContentType === undefined ? undefined : asNullableString(body.receiptContentType),
      },
      include: { project: { select: { id: true, title: true, client: true, slug: true } } },
    });
    return NextResponse.json({ ok: true, expense });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update expense.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
