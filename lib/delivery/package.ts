import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";

export const DELIVERY_GROUPS = [
  "hero",
  "interior",
  "details",
  "web",
  "print",
  "social",
  "archive",
] as const;

export type DeliveryGroup = (typeof DELIVERY_GROUPS)[number];

export const DELIVERY_GROUP_DEFINITIONS: Record<DeliveryGroup, string> = {
  hero: "Best hero images for website, landing pages, banners, or campaign lead visuals.",
  interior: "Main space/environment images for architecture, office, real estate, and hospitality-style projects.",
  details: "Close-up images, textures, materials, product details, design moments, and supporting visuals.",
  web: "Optimized images for website use.",
  print: "High-resolution images for print, decks, brochures, signage, and press.",
  social: "Images recommended for Instagram, LinkedIn, reels covers, carousels, or social posts.",
  archive: "Delivered but not highlighted; useful backup or secondary images.",
};

export function normalizeDeliveryGroup(value: unknown): DeliveryGroup | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return DELIVERY_GROUPS.find((group) => group === normalized) ?? null;
}

export function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function buildDeliveryManifest(projectId: string) {
  const project = await prisma.workProject.findUnique({
    where: { id: projectId },
    include: {
      heroMedia: true,
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!project) throw new Error("Project not found.");

  const selected = project.media.filter((item) => item.selectedForDelivery);
  const finalImages = selected.length ? selected : project.media.filter((item) => item.media.kind === "IMAGE");
  const grouped = DELIVERY_GROUPS.map((group) => {
    const images = finalImages.filter((item) => (item.deliveryGroup ?? "archive") === group);
    return {
      group,
      description: DELIVERY_GROUP_DEFINITIONS[group],
      imageCount: images.length,
      images: images.map((item) => ({
        id: item.mediaId,
        filename: item.media.keyFull?.split("/").pop() ?? item.media.id,
        keyFull: item.media.keyFull,
        keyThumb: item.media.keyThumb,
        altText: item.media.alt,
        usageSuggestion: item.usageSuggestion,
        clientFacingCaption: item.clientFacingCaption,
        aiDescription: item.aiDescription,
        fileFormat: item.fileFormat,
        imagePurpose: item.imagePurpose,
      })),
    };
  });

  const invoice = project.attachedInvoiceId
    ? await prisma.studioInvoice.findUnique({
        where: { id: project.attachedInvoiceId },
        include: {
          client: true,
          project: true,
          lineItems: { orderBy: { sortOrder: "asc" } },
        },
      })
    : null;

  return {
    project: {
      id: project.id,
      title: project.title,
      clientName: project.client,
      projectType: project.projectType,
      location: project.location,
      deliveryDate: new Date().toISOString(),
      finalImageCount: finalImages.length,
      seoTitle: project.seoTitle,
      metaDescription: project.metaDescription,
      tags: project.tags,
      ctaCopy: project.ctaCopy,
    },
    positioning:
      "Bright Line delivers a ready-to-use visual system, not just a folder of images.",
    groups: grouped,
    recommendedUseCases: grouped
      .filter((group) => group.imageCount > 0)
      .map((group) => ({ group: group.group, description: group.description })),
    socialMediaSuggestions: grouped.find((group) => group.group === "social")?.images ?? [],
    invoice: invoice
      ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client.companyName,
          projectName: invoice.project?.title ?? project.title,
          issueDate: invoice.issuedAt,
          dueDate: invoice.dueAt,
          status: invoice.status,
          subtotal: invoice.subtotal.toString(),
          discount: invoice.discount.toString(),
          tax: invoice.tax.toString(),
          total: invoice.total.toString(),
          amountPaid: invoice.amountPaid.toString(),
          balanceDue: invoice.balanceRemaining.toString(),
          paymentInstructions: invoice.notes,
          lineItems: invoice.lineItems.map((line) => ({
            name: line.name,
            quantity: line.quantity.toString(),
            rate: line.unitPrice.toString(),
            amount: line.amount.toString(),
          })),
        }
      : null,
  };
}

function money(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return numeric.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function pdfToBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function buildDeliverySummaryPdf(projectId: string) {
  const manifest = await buildDeliveryManifest(projectId);
  const doc = new PDFDocument({ size: "LETTER", margin: 54, info: { Title: `${manifest.project.title} Delivery Summary` } });
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font("Helvetica-Bold").fontSize(11).text("BRIGHTLINE PHOTOGRAPHY", { characterSpacing: 1.8 });
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(24).text("Final Delivery Summary");
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(11).fillColor("#444444").text(manifest.positioning, { width });
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#111111").text(manifest.project.title);
  doc.font("Helvetica").fontSize(10).fillColor("#555555").text(
    [manifest.project.clientName, manifest.project.projectType, manifest.project.location].filter(Boolean).join(" / ")
  );
  doc.moveDown(1);
  doc.font("Helvetica").fontSize(10).text(`Final images: ${manifest.project.finalImageCount}`);
  doc.text(`Delivery date: ${new Date(manifest.project.deliveryDate).toLocaleDateString()}`);

  for (const group of manifest.groups.filter((item) => item.imageCount > 0)) {
    doc.moveDown(1.1);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text(`${group.group.toUpperCase()} (${group.imageCount})`, { characterSpacing: 1 });
    doc.font("Helvetica").fontSize(9.5).fillColor("#555555").text(group.description);
    for (const image of group.images.slice(0, 8)) {
      doc.moveDown(0.35);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#222222").text(image.filename);
      doc.font("Helvetica").fontSize(8.5).fillColor("#666666").text(
        [image.usageSuggestion, image.clientFacingCaption, image.altText].filter(Boolean).join(" ")
      );
    }
  }

  if (manifest.invoice) {
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#111111").text(`Invoice #${manifest.invoice.invoiceNumber}`);
    doc.font("Helvetica").fontSize(10).fillColor("#555555").text(`${manifest.invoice.clientName} / ${manifest.invoice.projectName}`);
    doc.moveDown(1);
    for (const line of manifest.invoice.lineItems) {
      doc.font("Helvetica").fontSize(9).text(`${line.name}  ${line.quantity} x ${money(line.rate)}  ${money(line.amount)}`);
    }
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(10).text(`Total: ${money(manifest.invoice.total)}`);
    doc.text(`Amount paid: ${money(manifest.invoice.amountPaid)}`);
    doc.text(`Balance due: ${money(manifest.invoice.balanceDue)}`);
    doc.moveDown(0.8);
    doc.font("Helvetica").fontSize(9).text(manifest.invoice.paymentInstructions || "Payment instructions will be provided by BRIGHTLINE Photography.");
  }

  return pdfToBuffer(doc);
}

