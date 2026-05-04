import type { WorkProject } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateProjectCopy, type ProjectCopyValues } from "@/lib/ai/generateProjectCopy";
import { getPillarBySlug, getPrimaryWorkSection } from "@/lib/work-pillar-settings";

export const AUTO_PROJECT_TRIGGER = "media_uploaded_auto_project";
export const AUTO_PROJECT_WORKFLOW = "auto_create_project_from_media";

type CreateProjectFromMediaInput = {
  keys: string[];
  generateCopy?: boolean;
  force?: boolean;
  source?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(input: string) {
  return input
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeKey(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.searchParams.get("key")?.replace(/^\/+/, "") || url.pathname.replace(/^\/+/, "");
  } catch {
    return value.replace(/^\/+/, "");
  }
}

function filenameWithoutExt(key: string) {
  return (key.split("/").pop() ?? key).replace(/\.[^.]+$/, "");
}

function inferPillar(keys: string[]) {
  const text = keys.join(" ").toLowerCase();
  if (/\b(architecture|architectural|interior|interiors|real[-_\s]?estate|hospitality|arc|rea|tri)\b/.test(text)) {
    return "architecture";
  }
  if (/\b(corporate|business|headshot|headshots|portrait|team|office|workplace|cor|biz)\b/.test(text)) {
    return "corporate";
  }
  return "advertising";
}

function inferGroupName(keys: string[]) {
  const first = keys[0] ?? "";
  const parts = first.split("/").filter(Boolean);
  const filename = filenameWithoutExt(first);
  const ignored = new Set(["portfolio", "studio", "full", "thumb", "web_full", "web_thumb", "images", "exports"]);
  const folderCandidate = [...parts.slice(0, -1)].reverse().find((part) => !ignored.has(part.toLowerCase()) && !/\d{6,8}/.test(part));
  if (folderCandidate) return titleCase(folderCandidate);
  const dateMatch = keys.join(" ").match(/(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)/);
  if (dateMatch) return `Auto Import ${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  return titleCase(filename.replace(/\b\d{3,}\b/g, "").trim() || "Uploaded Media Draft");
}

function tagsFromKeys(keys: string[], pillar: string, title: string) {
  const words = new Set<string>([pillar, ...title.toLowerCase().split(/\s+/)]);
  for (const key of keys) {
    for (const part of key.toLowerCase().split(/[\/\s._-]+/)) {
      if (part.length >= 4 && !/^\d+$/.test(part) && !["portfolio", "webp", "jpeg", "jpg", "png", "full", "thumb"].includes(part)) {
        words.add(part);
      }
    }
  }
  return [...words].slice(0, 16);
}

async function autoCreateEnabled(force?: boolean) {
  if (force) return true;
  const rule = await prisma.automationRule.findFirst({
    where: { triggerEvent: AUTO_PROJECT_TRIGGER },
    orderBy: { updatedAt: "desc" },
  });
  return Boolean(rule?.isEnabled);
}

export async function ensureAutoProjectRule() {
  return prisma.automationRule.upsert({
    where: { id: "auto-project-from-media-rule" },
    update: {},
    create: {
      id: "auto-project-from-media-rule",
      name: "Auto-create project from new uploads",
      triggerEvent: AUTO_PROJECT_TRIGGER,
      isEnabled: false,
      notes: "Creates unpublished WorkProject drafts and attaches uploaded R2 media for admin review.",
    },
  });
}

export async function recentAutoCreatedProjects() {
  return prisma.automationRun.findMany({
    where: { workflowName: AUTO_PROJECT_WORKFLOW, entityType: "workProject", entityId: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 8,
  });
}

export async function createProjectFromMedia(input: CreateProjectFromMediaInput) {
  const keys = [...new Set(input.keys.map(normalizeKey).filter(Boolean))];
  const startedAt = new Date();
  if (!keys.length) throw new Error("At least one media key is required.");
  if (!(await autoCreateEnabled(input.force))) {
    return { skipped: true, reason: "Auto-create project automation is disabled.", project: null, attachedCount: 0 };
  }

  const title = inferGroupName(keys);
  const pillarSlug = inferPillar(keys);
  const pillar = await getPillarBySlug(pillarSlug);
  if (!pillar) throw new Error(`Pillar "${pillarSlug}" is not configured.`);
  const section = getPrimaryWorkSection(pillar);
  const baseSlug = slugify(title) || "uploaded-media-draft";
  const tags = tagsFromKeys(keys, pillarSlug, title);

  const existing = await prisma.workProject.findFirst({
    where: { section, slug: { equals: baseSlug, mode: "insensitive" }, published: false },
    include: { media: { include: { media: true } } },
  });
  let projectSlug = baseSlug;
  if (!existing) {
    let suffix = 2;
    while (await prisma.workProject.findFirst({ where: { section, slug: { equals: projectSlug, mode: "insensitive" } }, select: { id: true } })) {
      projectSlug = `${baseSlug}-${suffix++}`;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let project: WorkProject;
    if (existing) {
      project = existing;
    } else {
      const hero = await tx.mediaAsset.upsert({
        where: { id: `auto-${slugify(keys[0]).slice(0, 20)}` },
        update: {},
        create: {
          id: `auto-${slugify(keys[0]).slice(0, 20)}`,
          kind: "IMAGE",
          keyFull: keys[0],
          keyThumb: keys[0],
          alt: title,
        },
      }).catch(() => null);
      project = await tx.workProject.create({
        data: {
          section,
          title,
          slug: projectSlug,
          summary: "Auto-created draft from newly uploaded media.",
          published: false,
          isFeatured: false,
          sortOrder: 0,
          heroMediaId: hero?.id ?? null,
          tags,
          projectType: pillar.label,
          whatWasPhotographed: title,
        },
      });
    }

    const currentLinks = await tx.projectMedia.findMany({
      where: { projectId: project.id },
      include: { media: true },
    });
    const existingKeys = new Set(currentLinks.map((link) => link.media.keyFull).filter(Boolean));
    let sortOrder = currentLinks.reduce((max, link) => Math.max(max, link.sortOrder), -1) + 1;
    let attachedCount = 0;

    for (const key of keys) {
      if (existingKeys.has(key)) continue;
      const media = await tx.mediaAsset.findFirst({ where: { keyFull: key } }) ?? await tx.mediaAsset.create({
        data: {
          kind: /\.(mp4|mov|webm|m4v)$/i.test(key) ? "VIDEO" : "IMAGE",
          keyFull: key,
          keyThumb: /\.(mp4|mov|webm|m4v)$/i.test(key) ? null : key,
          alt: titleCase(filenameWithoutExt(key)),
        },
      });
      await tx.projectMedia.upsert({
        where: { projectId_mediaId: { projectId: project.id, mediaId: media.id } },
        update: {},
        create: { projectId: project.id, mediaId: media.id, sortOrder: sortOrder++ },
      });
      attachedCount += 1;
    }

    await tx.automationRun.create({
      data: {
        workflowName: AUTO_PROJECT_WORKFLOW,
        status: "success",
        triggerType: input.source ?? "manual",
        entityType: "workProject",
        entityId: project.id,
        message: `${existing ? "Updated" : "Created"} draft "${project.title}" with ${attachedCount} new asset(s).`,
        startedAt,
        finishedAt: new Date(),
      },
    });

    return { project, attachedCount };
  });

  let copyValues: ProjectCopyValues | null = null;
  if (input.generateCopy && process.env.OPENAI_API_KEY?.trim()) {
    const generated = await generateProjectCopy({
      projectId: result.project.id,
      mode: "all_fields",
      brief: {
        projectTitle: result.project.title,
        projectType: pillar.label,
        pillar: pillarSlug,
        whatWasPhotographed: title,
        notes: `Auto-created from uploaded media keys: ${keys.slice(0, 12).join(", ")}`,
        desiredStyle: "Editorial, polished, draft only.",
      },
      existingValues: {},
      tonePreset: "Editorial",
    });
    if (!("values" in generated)) {
      throw new Error("AI copy generation returned an unexpected response.");
    }
    copyValues = generated.values;
    const values = copyValues;
    await prisma.workProject.update({
      where: { id: result.project.id },
      data: {
        opening: values.opening || undefined,
        context: values.context || undefined,
        approach: values.approach || undefined,
        highlight: values.highlightLine || undefined,
        execution: values.execution || undefined,
        closing: values.closing || undefined,
        seoTitle: values.seoTitle || undefined,
        metaDescription: values.metaDescription || undefined,
        ctaCopy: values.ctaCopy || undefined,
        overviewExtended: values.overviewExtended || undefined,
        tags: values.projectTags ? values.projectTags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 48) : undefined,
      },
    });
    await prisma.aiGeneration.create({
      data: {
        projectId: result.project.id,
        generationType: "project_copy",
        promptMode: "auto_project_draft",
        inputBrief: { keys, pillar: pillarSlug, title },
        outputJSON: JSON.parse(JSON.stringify(copyValues)),
        modelUsed: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        createdBy: "automation",
      },
    }).catch(() => null);
  }

  const project = await prisma.workProject.findUnique({
    where: { id: result.project.id },
    include: {
      heroMedia: true,
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return { skipped: false, project, attachedCount: result.attachedCount, copyValues };
}

