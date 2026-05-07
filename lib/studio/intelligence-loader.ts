import { prisma } from "@/lib/prisma";
import type { PriorityProject } from "@/lib/studio/priorityEngine";

/** Shared select for Studio OS operational intelligence (Mission Control + APIs). */
export async function loadStudioProjectsForIntelligence(take = 100): Promise<PriorityProject[]> {
  const rows = await prisma.studioProject.findMany({
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      client: true,
      status: true,
      deliveryDate: true,
      updatedAt: true,
      totalPrice: true,
      amountPaid: true,
      balanceRemaining: true,
      paymentStatus: true,
      contentStatus: true,
      contentPosted: true,
      reusableLater: true,
      isPublicReady: true,
    },
  });
  return rows as PriorityProject[];
}
