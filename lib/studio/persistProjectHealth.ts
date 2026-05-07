import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProjectHealthScores } from "@/lib/studio/priorityEngine";

function utcDayStart(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/**
 * Persist deterministic daily health snapshots for Studio projects (idempotent per project per UTC day).
 */
export async function upsertDailyProjectHealthSnapshots(
  scores: Record<string, ProjectHealthScores>,
  asOf: Date = new Date()
): Promise<void> {
  const dateBucket = utcDayStart(asOf);
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  for (const [studioProjectId, s] of Object.entries(scores)) {
    ops.push(
      prisma.projectHealthSnapshot.upsert({
        where: {
          studioProjectId_dateBucket: { studioProjectId, dateBucket },
        },
        create: {
          studioProjectId,
          dateBucket,
          healthScore: s.health,
          productionRiskScore: s.productionRisk,
          deliveryReadinessScore: s.deliveryReadiness,
          profitabilityScore: s.profitability,
          factors: s.factors as object,
        },
        update: {
          healthScore: s.health,
          productionRiskScore: s.productionRisk,
          deliveryReadinessScore: s.deliveryReadiness,
          profitabilityScore: s.profitability,
          factors: s.factors as object,
        },
      })
    );
  }

  if (ops.length) await prisma.$transaction(ops);
}
