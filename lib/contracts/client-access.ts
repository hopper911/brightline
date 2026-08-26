import { prisma } from "@/lib/prisma";

/** Resolve Studio OS client id when gallery links to a StudioProject with clientId. */
export async function studioClientIdFromGallery(gallery: {
  studioProjectId: string | null;
}): Promise<string | null> {
  if (!gallery.studioProjectId) return null;
  const proj = await prisma.studioProject.findUnique({
    where: { id: gallery.studioProjectId },
    select: { clientId: true },
  });
  return proj?.clientId ?? null;
}

export async function loadGeneratedDocumentForToken(token: string) {
  return prisma.generatedDocument.findFirst({
    where: { clientToken: token },
    include: {
      template: true,
      studioClient: true,
      studioProject: true,
      signature: true,
    },
  });
}

export function galleryMayAccessDocument(studioClientId: string | null, documentStudioClientId: string): boolean {
  if (!studioClientId) return false;
  return studioClientId === documentStudioClientId;
}
