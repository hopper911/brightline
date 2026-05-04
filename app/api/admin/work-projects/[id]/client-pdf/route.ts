import PDFDocument from "pdfkit";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getObjectBuffer } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

async function imageBufferForPdf(key: string | null | undefined) {
  if (!key) return null;
  if (/^(https?:|data:|blob:|\/)/i.test(key)) return null;
  try {
    const source = await getObjectBuffer(key);
    return await sharp(source).rotate().jpeg({ quality: 82 }).toBuffer();
  } catch (err) {
    console.warn("CLIENT_PDF_IMAGE_SKIP", key, err);
    return null;
  }
}

function writeSection(doc: PDFKit.PDFDocument, title: string, body: string) {
  if (!body.trim()) return;
  doc.moveDown(0.9);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111").text(title.toUpperCase(), { characterSpacing: 1.2 });
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(10.5).fillColor("#333333").text(body, { lineGap: 3 });
}

function pdfToBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await prisma.workProject.findUnique({
    where: { id },
    include: {
      heroMedia: true,
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }

  const doc = new PDFDocument({ size: "LETTER", margin: 54, info: { Title: `${project.title} Case Study` } });
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const hero = project.heroMedia ?? project.media.find((pm) => pm.media.kind === "IMAGE")?.media ?? null;
  const heroImage = await imageBufferForPdf(hero?.keyFull ?? hero?.keyThumb);

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111111").text("BRIGHTLINE PHOTOGRAPHY", { characterSpacing: 1.8 });
  doc.moveDown(1.1);
  doc.font("Helvetica-Bold").fontSize(25).fillColor("#111111").text(project.title, { lineGap: 2 });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10).fillColor("#555555").text(
    [clean(project.client), clean(project.projectType), clean(project.location)].filter(Boolean).join("  /  ")
  );

  if (heroImage) {
    doc.moveDown(1.2);
    doc.image(heroImage, { fit: [pageWidth, 260], align: "center" });
  }

  writeSection(doc, "Project Overview", clean(project.opening) || clean(project.overviewExtended) || clean(project.description) || clean(project.summary));
  writeSection(doc, "Context", clean(project.context) || clean(project.locationContext));
  writeSection(doc, "Approach", clean(project.approach) || clean(project.visualApproach));
  writeSection(doc, "Execution", clean(project.execution));

  const finalImages = project.media
    .filter((pm) => pm.media.kind === "IMAGE" && pm.media.id !== hero?.id)
    .slice(0, 6);
  if (finalImages.length) {
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111").text("SELECTED FINAL IMAGES", { characterSpacing: 1.2 });
    doc.moveDown(0.7);
    const columns = 2;
    const gap = 14;
    const cellWidth = (pageWidth - gap) / columns;
    const cellHeight = 150;
    let index = 0;
    for (const item of finalImages) {
      const buffer = await imageBufferForPdf(item.media.keyFull ?? item.media.keyThumb);
      if (!buffer) continue;
      const x = doc.page.margins.left + (index % columns) * (cellWidth + gap);
      const y = doc.y + Math.floor(index / columns) * (cellHeight + 34);
      doc.image(buffer, x, y, { fit: [cellWidth, cellHeight] });
      doc.font("Helvetica").fontSize(8).fillColor("#666666").text(clean(item.media.alt), x, y + cellHeight + 5, { width: cellWidth });
      index += 1;
      if (index === 4 && finalImages.length > 4) {
        doc.addPage();
        doc.y = doc.page.margins.top;
      }
    }
  }

  doc.addPage();
  writeSection(doc, "Image Usage Notes", clean(project.whoIsThisFor) || clean(project.ctaCopy));
  writeSection(doc, "SEO / Marketing Notes", [clean(project.seoTitle), clean(project.metaDescription), project.tags.join(", ")].filter(Boolean).join("\n"));
  writeSection(doc, "Next Step", clean(project.ctaCopy) || "For licensing, campaign use, or additional image selections, contact BRIGHTLINE Photography.");
  doc.moveDown(2);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text("BRIGHTLINE PHOTOGRAPHY");
  doc.font("Helvetica").fontSize(9).fillColor("#555555").text("Commercial photography for brands, spaces, and campaigns.");

  const buffer = await pdfToBuffer(doc);
  const filename = `${project.slug || "brightline-case-study"}-case-study.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

