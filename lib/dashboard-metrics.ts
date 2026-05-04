import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAID_STATUSES = ["PAID", "PARTIALLY_PAID"] as const;

const DELIVERED_PACKAGE_STATUSES = ["sent", "viewed", "approved", "archived"];
const PENDING_PACKAGE_STATUSES = ["draft", "prepared"];

function decToNumber(v: Prisma.Decimal | null | undefined): number {
  if (v == null) return 0;
  return Number(v);
}

function monthKeys(monthsBack: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(12, 0, 0, 0);
  for (let i = monthsBack - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCMonth(d.getUTCMonth() - i);
    const y = x.getUTCFullYear();
    const m = String(x.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
  }
  return out;
}

export type DashboardMetrics = {
  revenue: {
    total: number;
    monthly: Array<{ month: string; label: string; amount: number }>;
    averageProjectValue: number | null;
    averageInvoiceValue: number | null;
  };
  clients: {
    total: number;
    repeat: number;
    topByRevenue: Array<{
      clientId: string;
      name: string;
      revenue: number;
      invoiceCount: number;
    }>;
  };
  projects: {
    perMonth: Array<{ month: string; label: string; count: number }>;
    averageTurnaroundDays: number | null;
    recent: Array<{
      id: string;
      title: string;
      status: string;
      client: string | null;
      updatedAt: string;
    }>;
  };
  delivery: {
    delivered: number;
    pending: number;
  };
};

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const monthsBack = 12;
  const keys = monthKeys(monthsBack);
  const rangeStart = new Date(`${keys[0]}-01T00:00:00.000Z`);

  const [
    revenueAgg,
    invoiceRowsForAvg,
    monthlyRevenueRows,
    totalClients,
    repeatClientsRow,
    topClientGroups,
    monthlyProjectRows,
    turnaroundRow,
    deliveredPkgs,
    pendingPkgs,
    recentProjects,
  ] = await Promise.all([
    prisma.studioInvoice.aggregate({
      where: {
        status: { in: [...PAID_STATUSES] },
        amountPaid: { gt: 0 },
      },
      _sum: { amountPaid: true },
      _count: { id: true },
    }),
    prisma.studioInvoice.findMany({
      where: {
        status: { in: [...PAID_STATUSES] },
        amountPaid: { gt: 0 },
      },
      select: { id: true, projectId: true, amountPaid: true },
    }),
    prisma.$queryRaw<Array<{ month: string; sum: Prisma.Decimal }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', COALESCE("paidAt", "updatedAt")), 'YYYY-MM') AS month,
        SUM("amountPaid")::numeric AS sum
      FROM "StudioInvoice"
      WHERE "status" IN ('PAID', 'PARTIALLY_PAID')
        AND "amountPaid" > 0
        AND COALESCE("paidAt", "updatedAt") >= ${rangeStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.studioClient.count(),
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM "StudioClient" sc
      WHERE (
        SELECT COUNT(*)::int FROM "StudioProject" p
        WHERE p."clientId" = sc.id AND p."isCancelled" = false
      ) >= 2
      OR (
        SELECT COUNT(*)::int FROM "StudioInvoice" i
        WHERE i."clientId" = sc.id
          AND i."status" IN ('PAID', 'PARTIALLY_PAID')
      ) >= 2
    `,
    prisma.studioInvoice.groupBy({
      by: ["clientId"],
      where: {
        status: { in: [...PAID_STATUSES] },
        amountPaid: { gt: 0 },
      },
      _sum: { amountPaid: true },
      _count: { id: true },
      orderBy: { _sum: { amountPaid: "desc" } },
      take: 10,
    }),
    prisma.$queryRaw<Array<{ month: string; c: bigint }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month,
        COUNT(*)::bigint AS c
      FROM "StudioProject"
      WHERE "isCancelled" = false AND "createdAt" >= ${rangeStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<Array<{ avg_days: number | null }>>`
      SELECT
        AVG(EXTRACT(EPOCH FROM ("deliveryDate" - "createdAt")) / 86400)::float AS avg_days
      FROM "StudioProject"
      WHERE "isCancelled" = false
        AND "deliveryDate" IS NOT NULL
        AND "deliveryDate" >= "createdAt"
    `,
    prisma.deliveryPackage.count({
      where: { status: { in: DELIVERED_PACKAGE_STATUSES } },
    }),
    prisma.deliveryPackage.count({
      where: { status: { in: PENDING_PACKAGE_STATUSES } },
    }),
    prisma.studioProject.findMany({
      where: { isCancelled: false },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        client: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalRevenue = decToNumber(revenueAgg._sum.amountPaid);
  const paidInvoiceCount = revenueAgg._count.id;

  const sumByProject = new Map<string, number>();
  for (const row of invoiceRowsForAvg) {
    const pid = row.projectId;
    if (!pid) continue;
    sumByProject.set(pid, (sumByProject.get(pid) ?? 0) + decToNumber(row.amountPaid));
  }
  const projectTotals = [...sumByProject.values()];
  const averageProjectValue =
    projectTotals.length > 0
      ? projectTotals.reduce((a, b) => a + b, 0) / projectTotals.length
      : null;

  const averageInvoiceValue =
    paidInvoiceCount > 0 ? totalRevenue / paidInvoiceCount : null;

  const revenueByMonth = new Map<string, number>();
  for (const r of monthlyRevenueRows) {
    revenueByMonth.set(r.month, decToNumber(r.sum));
  }
  const monthly = keys.map((k) => ({
    month: k,
    label: monthLabel(k),
    amount: revenueByMonth.get(k) ?? 0,
  }));

  const perMonthCount = new Map<string, number>();
  for (const r of monthlyProjectRows) {
    perMonthCount.set(r.month, Number(r.c));
  }
  const perMonth = keys.map((k) => ({
    month: k,
    label: monthLabel(k),
    count: perMonthCount.get(k) ?? 0,
  }));

  const clientIds = topClientGroups.map((g) => g.clientId);
  const clientRows = await prisma.studioClient.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, companyName: true },
  });
  const nameById = new Map(clientRows.map((c) => [c.id, c.companyName]));

  const topByRevenue = topClientGroups.map((g) => ({
    clientId: g.clientId,
    name: nameById.get(g.clientId) ?? "Unknown client",
    revenue: decToNumber(g._sum.amountPaid),
    invoiceCount: g._count.id,
  }));

  const repeat = Number(repeatClientsRow[0]?.c ?? 0);

  const avgTurn = turnaroundRow[0]?.avg_days;
  const averageTurnaroundDays =
    avgTurn != null && Number.isFinite(avgTurn) ? Math.round(avgTurn * 10) / 10 : null;

  return {
    revenue: {
      total: totalRevenue,
      monthly,
      averageProjectValue,
      averageInvoiceValue,
    },
    clients: {
      total: totalClients,
      repeat,
      topByRevenue,
    },
    projects: {
      perMonth,
      averageTurnaroundDays,
      recent: recentProjects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        client: p.client,
        updatedAt: p.updatedAt.toISOString(),
      })),
    },
    delivery: {
      delivered: deliveredPkgs,
      pending: pendingPkgs,
    },
  };
}
