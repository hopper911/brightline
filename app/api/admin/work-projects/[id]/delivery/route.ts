import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { buildDeliveryManifest, buildDeliverySummaryPdf, cleanText, normalizeDeliveryGroup } from "@/lib/delivery/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function boolOrUndefined(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  try {
    if (format === "pdf") {
      const buffer = await buildDeliverySummaryPdf(id);
      await prisma.workProject.update({ where: { id }, data: { clientPdfGeneratedAt: new Date() } }).catch(() => null);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="brightline-delivery-summary.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const manifest = await buildDeliveryManifest(id);
    await prisma.workProject.update({ where: { id }, data: { deliveryPreparedAt: new Date() } }).catch(() => null);
    return NextResponse.json({ ok: true, manifest });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build delivery package.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id: projectId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const obj = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const mediaUpdates = Array.isArray(obj.images) ? obj.images : [];
  const finalPackageToken = obj.ensureToken ? randomBytes(24).toString("hex") : undefined;

  try {
    await prisma.$transaction(async (tx) => {
      if (finalPackageToken) {
        await tx.workProject.update({
          where: { id: projectId },
          data: { finalPackageToken },
        });
      }
      if (typeof obj.attachedInvoiceId === "string" || obj.attachedInvoiceId === null) {
        await tx.workProject.update({
          where: { id: projectId },
          data: { attachedInvoiceId: cleanText(obj.attachedInvoiceId) },
        });
      }
      for (const raw of mediaUpdates) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const image = raw as Record<string, unknown>;
        const mediaId = cleanText(image.id);
        if (!mediaId) continue;
        const deliveryGroup = normalizeDeliveryGroup(image.deliveryGroup);
        await tx.projectMedia.update({
          where: { projectId_mediaId: { projectId, mediaId } },
          data: {
            deliveryGroup: deliveryGroup ?? undefined,
            usageSuggestion: image.usageSuggestion !== undefined ? cleanText(image.usageSuggestion) : undefined,
            clientFacingCaption: image.clientFacingCaption !== undefined ? cleanText(image.clientFacingCaption) : undefined,
            aiDescription: image.aiDescription !== undefined ? cleanText(image.aiDescription) : undefined,
            fileFormat: image.fileFormat !== undefined ? cleanText(image.fileFormat) : undefined,
            imagePurpose: image.imagePurpose !== undefined ? cleanText(image.imagePurpose) : undefined,
            selectedForDelivery: boolOrUndefined(image.selectedForDelivery),
            confidenceScore:
              typeof image.confidenceScore === "number" && Number.isFinite(image.confidenceScore)
                ? Math.max(0, Math.min(100, Math.round(image.confidenceScore)))
                : undefined,
          },
        });
        if (image.altText !== undefined) {
          await tx.mediaAsset.update({
            where: { id: mediaId },
            data: { alt: cleanText(image.altText) },
          });
        }
      }
    });

    const project = await prisma.workProject.findUnique({
      where: { id: projectId },
      include: { heroMedia: true, media: { include: { media: true }, orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ ok: true, project });
  } catch (err) {
    const message = err instanceof Prisma.PrismaClientKnownRequestError ? "Delivery metadata could not be saved." : err instanceof Error ? err.message : "Delivery metadata could not be saved.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

