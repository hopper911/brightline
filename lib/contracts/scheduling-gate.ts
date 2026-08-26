import { DocumentTemplateType, GeneratedDocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Returns template types from `StudioProject.requireSignedDocumentTypes` that are not yet signed for this project. */
export async function getBlockingUnsignedDocumentTypes(projectId: string): Promise<DocumentTemplateType[]> {
  const project = await prisma.studioProject.findUnique({
    where: { id: projectId },
    select: { requireSignedDocumentTypes: true },
  });
  const raw = project?.requireSignedDocumentTypes;
  if (!raw || !Array.isArray(raw)) return [];
  const required = raw.filter((x): x is DocumentTemplateType =>
    typeof x === "string" && (Object.values(DocumentTemplateType) as string[]).includes(x)
  );
  if (required.length === 0) return [];

  const signed = await prisma.generatedDocument.findMany({
    where: {
      studioProjectId: projectId,
      status: GeneratedDocumentStatus.SIGNED,
      template: { type: { in: required } },
    },
    select: { template: { select: { type: true } } },
  });
  const done = new Set(signed.map((d) => d.template.type));
  return required.filter((t) => !done.has(t));
}
