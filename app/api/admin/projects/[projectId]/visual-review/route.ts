import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getPublicR2Url } from "@/lib/r2";
import { generateVisualReview } from "@/lib/ai/visualReview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { projectId } = await context.params;
  let body: { mediaIds?: string[] } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const requestedIds = Array.isArray(body.mediaIds) ? body.mediaIds.filter(Boolean) : [];
  const project = await prisma.workProject.findUnique({
    where: { id: projectId },
    include: {
      media: {
        where: {
          media: { kind: "IMAGE" },
          ...(requestedIds.length ? { mediaId: { in: requestedIds } } : {}),
        },
        include: { media: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!project) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });

  const origin = new URL(req.url).origin;
  const images = project.media
    .map((item) => {
      const key = item.media.keyFull ?? item.media.keyThumb;
      return key
        ? {
            id: item.mediaId,
            url: new URL(getPublicR2Url(key), origin).toString(),
            filename: key.split("/").pop(),
            altText: item.media.alt ?? undefined,
            deliveryGroup: item.deliveryGroup ?? undefined,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!images.length) {
    return NextResponse.json({ ok: false, error: "No images found for visual review." }, { status: 400 });
  }

  try {
    const result = await generateVisualReview({
      projectId,
      projectContext: {
        clientName: project.client,
        projectTitle: project.title,
        pillar: project.section,
        location: project.location,
        whatWasPhotographed: project.whatWasPhotographed,
        visualApproach: project.visualApproach,
      },
      images,
    });

    await prisma.aiGeneration.create({
      data: {
        projectId,
        fieldKey: "visualReview",
        generationType: "delivery_recommendation",
        promptMode: "visual_review",
        inputBrief: { imageCount: images.length },
        outputJSON: result,
        modelUsed: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
        createdBy: "admin",
      },
    });

    for (const reviewed of result.images) {
      await prisma.deliveryPackageItem.updateMany({
        where: {
          mediaAssetId: reviewed.id,
          deliveryPackage: { projectId },
        },
        data: {
          aiBestUseCase: reviewed.bestUseCase,
          aiUseCaseConfidence: reviewed.useCaseConfidence,
          aiUseCaseReasoning: reviewed.useCaseReasoning,
        },
      });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number" ? err.status : 502;
    const message = err instanceof Error ? err.message : "AI visual review failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

