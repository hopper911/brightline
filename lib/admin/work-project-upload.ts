import { prisma } from "@/lib/prisma";
import { getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";

export type WorkProjectUploadSubfolder =
  | "full"
  | "thumb"
  | "video"
  | "background"
  | "poster";

const ALLOWED_SUBFOLDERS = new Set<string>([
  "full",
  "thumb",
  "video",
  "background",
  "poster",
]);

export async function resolveWorkProjectUploadTarget(options: {
  projectId: string;
  filename: string;
  contentType?: string;
  subfolder?: WorkProjectUploadSubfolder;
}) {
  const project = await prisma.workProject.findUnique({
    where: { id: options.projectId },
  });
  if (!project) {
    return { ok: false as const, error: "Project not found." };
  }

  if (
    options.subfolder !== undefined &&
    !ALLOWED_SUBFOLDERS.has(options.subfolder)
  ) {
    return { ok: false as const, error: "Invalid subfolder." };
  }

  const safeName = options.filename.replace(/[^\w.-]/g, "-");
  if (!safeName) {
    return { ok: false as const, error: "Invalid filename." };
  }

  const ext = (safeName.split(".").pop() ?? "").toLowerCase();
  const isVideo = ext === "mp4" || ext === "webm" || ext === "mov";
  const subfolder =
    options.subfolder ?? (isVideo ? ("video" as const) : ("full" as const));

  const defaultContentType = isVideo
    ? ext === "webm"
      ? "video/webm"
      : "video/mp4"
    : "image/jpeg";

  const contentType =
    options.contentType?.trim() || defaultContentType;

  const sectionMap = await getSectionToPillarSlugMap();
  const pillarSlug = sectionMap[project.section];
  const key = `portfolio/${pillarSlug}/${project.slug}/${subfolder}/${safeName}`;

  return {
    ok: true as const,
    key,
    contentType,
    subfolder,
    project,
  };
}
