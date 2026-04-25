import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  asNullableString,
  getMonthRange,
  parseDate,
  parsePositiveMoney,
} from "@/lib/studio/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId")?.trim();
  const month = getMonthRange(searchParams.get("month"));
  const expenses = await prisma.studioExpense.findMany({
    where: {
      date: { gte: month.start, lt: month.end },
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { date: "desc" },
    include: { project: { select: { id: true, title: true, client: true, slug: true } } },
    take: 300,
  });

  return NextResponse.json({ ok: true, month, expenses });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const category = asNullableString(body.category);
  if (!category) {
    return NextResponse.json({ ok: false, error: "category is required." }, { status: 400 });
  }

  try {
    const expense = await prisma.studioExpense.create({
      data: {
        projectId: asNullableString(body.projectId),
        amount: parsePositiveMoney(body.amount),
        category,
        note: asNullableString(body.note),
        date: parseDate(body.date),
        receiptPath: asNullableString(body.receiptPath),
        receiptKey: asNullableString(body.receiptKey),
        receiptFilename: asNullableString(body.receiptFilename),
        receiptContentType: asNullableString(body.receiptContentType),
      },
      include: { project: { select: { id: true, title: true, client: true, slug: true } } },
    });
    return NextResponse.json({ ok: true, expense });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create expense.";
    const status = message.includes("must") || message.includes("required") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
