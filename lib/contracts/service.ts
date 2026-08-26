import type { DocumentTemplate, StudioClient, StudioInvoice, StudioProject } from "@prisma/client";
import { GeneratedDocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildContractPdfBuffer } from "@/lib/contracts/pdf";
import { replaceTemplateVariables } from "@/lib/contracts/render";
import { contractPdfKey, generateClientToken } from "@/lib/contracts/r2-keys";
import { assertDocumentTransition } from "@/lib/contracts/status";
import { buildVariableMap } from "@/lib/contracts/variables";
import { putObjectBuffer } from "@/lib/storage-r2";

export async function loadVariableEntities(input: {
  studioClientId: string;
  studioProjectId?: string | null;
  studioInvoiceId?: string | null;
}): Promise<{
  client: StudioClient;
  project: StudioProject | null;
  invoice: StudioInvoice | null;
}> {
  const client = await prisma.studioClient.findUnique({ where: { id: input.studioClientId } });
  if (!client) throw Object.assign(new Error("Client not found"), { status: 404 });
  const project = input.studioProjectId
    ? await prisma.studioProject.findUnique({ where: { id: input.studioProjectId } })
    : null;
  const invoice = input.studioInvoiceId
    ? await prisma.studioInvoice.findUnique({ where: { id: input.studioInvoiceId } })
    : null;
  return { client, project: project ?? null, invoice: invoice ?? null };
}

export function renderDocumentHtml(
  template: DocumentTemplate,
  ctx: {
    client: StudioClient;
    project: StudioProject | null;
    invoice: StudioInvoice | null;
    galleryLink?: string | null;
    overrides?: Record<string, unknown> | null;
  }
): { html: string; variablesSnapshot: Record<string, string> } {
  const map = buildVariableMap({
    client: ctx.client,
    project: ctx.project,
    invoice: ctx.invoice,
    galleryLink: ctx.galleryLink ?? null,
    overrides: ctx.overrides ?? null,
  });
  const html = replaceTemplateVariables(template.contentHtml, map);
  return { html, variablesSnapshot: map };
}

export async function createGeneratedDocument(input: {
  templateId: string;
  studioClientId: string;
  studioProjectId?: string | null;
  studioInvoiceId?: string | null;
  title?: string | null;
  galleryLink?: string | null;
  variableOverrides?: Record<string, unknown> | null;
  initialStatus?: GeneratedDocumentStatus;
}) {
  const template = await prisma.documentTemplate.findUnique({ where: { id: input.templateId } });
  if (!template || !template.isActive) {
    throw Object.assign(new Error("Template not found or inactive."), { status: 404 });
  }
  const { client, project, invoice } = await loadVariableEntities({
    studioClientId: input.studioClientId,
    studioProjectId: input.studioProjectId,
    studioInvoiceId: input.studioInvoiceId,
  });
  const { html, variablesSnapshot } = renderDocumentHtml(template, {
    client,
    project,
    invoice,
    galleryLink: input.galleryLink,
    overrides: input.variableOverrides,
  });
  const title = input.title?.trim() || `${template.title} — ${client.companyName}`;
  const status = input.initialStatus ?? GeneratedDocumentStatus.GENERATED;
  const row = await prisma.generatedDocument.create({
    data: {
      templateId: template.id,
      studioClientId: client.id,
      studioProjectId: input.studioProjectId ?? project?.id ?? null,
      studioInvoiceId: input.studioInvoiceId ?? invoice?.id ?? null,
      title,
      status,
      contentHtml: html,
      variablesSnapshot,
      clientToken: generateClientToken(),
      templateVersion: template.version,
    },
    include: { template: true, studioClient: true, studioProject: true },
  });
  return { document: row, template };
}

export async function writeDraftPdfForDocument(
  documentId: string,
  existingBuffer?: Buffer
): Promise<string | null> {
  const doc = await prisma.generatedDocument.findUnique({
    where: { id: documentId },
    include: { studioClient: true, studioProject: true },
  });
  if (!doc) return null;
  const year = new Date().getFullYear();
  const clientSlug = doc.studioClient.companyName;
  const projectSlug = doc.studioProject?.slug ?? "no-project";
  const key = contractPdfKey({
    year,
    clientSlug,
    projectSlug,
    kind: "draft",
    documentId: doc.id,
  });
  const buf =
    existingBuffer ??
    (await buildContractPdfBuffer({
      title: doc.title,
      contentHtml: doc.contentHtml,
      documentId: doc.id,
    }));
  await putObjectBuffer({ key, body: buf, contentType: "application/pdf", access: "private" });
  await prisma.generatedDocument.update({
    where: { id: doc.id },
    data: { draftPdfKey: key },
  });
  return key;
}

export async function adminSetDocumentStatus(id: string, next: GeneratedDocumentStatus): Promise<void> {
  const row = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!row) throw Object.assign(new Error("Not found"), { status: 404 });
  assertDocumentTransition(row.status, next);
  await prisma.generatedDocument.update({ where: { id }, data: { status: next } });
}
