import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  asNullableString,
  getMonthRange,
  normalizePaymentType,
  parseDate,
  parsePositiveMoney,
  recalculateProjectFinance,
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
  const payments = await prisma.studioPayment.findMany({
    where: {
      date: { gte: month.start, lt: month.end },
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { date: "desc" },
    include: { project: { select: { id: true, title: true, client: true, slug: true } } },
    take: 300,
  });

  return NextResponse.json({ ok: true, month, payments });
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

  const projectId = asNullableString(body.projectId);
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId is required." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.studioPayment.create({
        data: {
          projectId,
          amount: parsePositiveMoney(body.amount),
          date: parseDate(body.date),
          type: normalizePaymentType(body.type),
          note: asNullableString(body.note),
        },
        include: { project: { select: { id: true, title: true, client: true, slug: true } } },
      });
      const project = await recalculateProjectFinance(tx, projectId);
      return { payment, project };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment.";
    const status = message.includes("not found") || message.includes("must") || message.includes("required")
      ? 400
      : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
