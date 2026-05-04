import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPillarBySlug, getPrimaryWorkSection } from "@/lib/work-pillar-settings";

type TemplateDefaults = {
  id: string;
  name: string;
  pillar: string;
  defaultFields: Prisma.InputJsonObject;
  defaultTags: string[];
  defaultDeliveryStructure: Prisma.InputJsonObject;
  defaultAISettings: Prisma.InputJsonObject;
};

export const DEFAULT_PROJECT_TEMPLATES: TemplateDefaults[] = [
  {
    id: "template-real-estate",
    name: "Real Estate",
    pillar: "architecture",
    defaultFields: {
      projectType: "Real Estate / Architecture",
      scope: "Exterior, interiors, detail images, and listing-ready visual delivery.",
      summary: "Draft real estate project prepared for listing, web, and marketing use.",
      whatWasPhotographed: "Property exteriors, interior rooms, architectural details, and surrounding context.",
      visualApproach: "Clean natural light, strong verticals, balanced room coverage, and practical sequencing.",
      whoIsThisFor: "Agents, developers, property teams, designers, and marketing teams.",
      ctaCopy: "Plan your next property photography package.",
    },
    defaultTags: ["real estate", "architecture", "interiors", "listing", "web", "print"],
    defaultDeliveryStructure: {
      groups: ["hero", "interior", "details", "web", "print", "archive"],
      required: ["hero", "web", "print"],
      notes: "Prioritize hero listing images, room coverage, detail selects, and web/print exports.",
    },
    defaultAISettings: {
      tonePreset: "Commercial",
      desiredStyle: "Clear, polished, listing-aware, and useful for property marketing.",
      promptHints: ["Emphasize property use cases", "Avoid over-selling", "Keep copy practical and premium"],
    },
  },
  {
    id: "template-corporate-office",
    name: "Corporate Office",
    pillar: "corporate",
    defaultFields: {
      projectType: "Corporate / Workplace",
      scope: "Workplace environment, team, leadership, and brand-supporting office imagery.",
      summary: "Draft corporate project prepared for recruiting, communications, web, and brand use.",
      whatWasPhotographed: "Office environments, team interactions, leadership portraits, and workplace details.",
      visualApproach: "Confident, natural, professional, and warm without feeling staged.",
      whoIsThisFor: "Founders, executives, HR teams, communications teams, and marketing departments.",
      ctaCopy: "Build a workplace image system for your team.",
    },
    defaultTags: ["corporate", "office", "workplace", "leadership", "team", "brand"],
    defaultDeliveryStructure: {
      groups: ["hero", "interior", "details", "web", "social", "archive"],
      required: ["hero", "web", "social"],
      notes: "Prioritize homepage hero options, team culture images, leadership selects, and social crops.",
    },
    defaultAISettings: {
      tonePreset: "Corporate strategic",
      desiredStyle: "Strategic, clear, executive-ready, and client-friendly.",
      promptHints: ["Connect imagery to trust and recruitment", "Keep language polished", "Avoid generic corporate buzzwords"],
    },
  },
  {
    id: "template-campaign-advertising",
    name: "Campaign / Advertising",
    pillar: "advertising",
    defaultFields: {
      projectType: "Campaign / Advertising",
      scope: "Campaign hero images, supporting visuals, detail selects, and channel-ready delivery.",
      summary: "Draft campaign project prepared for web, social, paid media, and brand storytelling.",
      whatWasPhotographed: "Campaign subjects, product or brand moments, detail images, and supporting scenes.",
      visualApproach: "Editorial, intentional, flexible across placements, and built for campaign reuse.",
      whoIsThisFor: "Creative directors, founders, brand teams, agencies, and marketing departments.",
      ctaCopy: "Create campaign photography built for every channel.",
    },
    defaultTags: ["campaign", "advertising", "editorial", "brand", "social", "web"],
    defaultDeliveryStructure: {
      groups: ["hero", "web", "social", "print", "details", "archive"],
      required: ["hero", "web", "social"],
      notes: "Prioritize campaign lead visuals, social-ready selects, print-capable images, and caption/SEO copy.",
    },
    defaultAISettings: {
      tonePreset: "Editorial",
      desiredStyle: "Editorial, premium, strategic, and campaign-aware.",
      promptHints: ["Focus on image utility", "Support multi-channel marketing", "Keep copy specific and modern"],
    },
  },
  {
    id: "template-product-detail",
    name: "Product / Detail Shoot",
    pillar: "advertising",
    defaultFields: {
      projectType: "Product / Detail",
      scope: "Product, texture, material, process, and detail-focused imagery.",
      summary: "Draft product/detail project prepared for ecommerce, brand pages, campaigns, and social use.",
      whatWasPhotographed: "Product details, materials, textures, close-ups, and supporting brand moments.",
      visualApproach: "Precise, tactile, clean, and composed to highlight form, finish, and use.",
      whoIsThisFor: "Product teams, founders, creative directors, ecommerce teams, and brand marketers.",
      ctaCopy: "Build a product image library with lasting marketing value.",
    },
    defaultTags: ["product", "details", "texture", "ecommerce", "brand", "social"],
    defaultDeliveryStructure: {
      groups: ["hero", "details", "web", "social", "print", "archive"],
      required: ["details", "web", "social"],
      notes: "Prioritize product hero images, close details, social crops, and web-ready descriptions.",
    },
    defaultAISettings: {
      tonePreset: "Quiet luxury",
      desiredStyle: "Precise, minimal, tactile, and premium.",
      promptHints: ["Describe what is visible", "Keep language concrete", "Connect details to product value"],
    },
  },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textField(fields: Record<string, unknown>, key: string) {
  const value = fields[key];
  return typeof value === "string" ? value.trim() || null : null;
}

export async function ensureDefaultProjectTemplates() {
  for (const template of DEFAULT_PROJECT_TEMPLATES) {
    await prisma.projectTemplate.upsert({
      where: { id: template.id },
      update: {},
      create: template,
    });
  }
}

export async function listProjectTemplates() {
  await ensureDefaultProjectTemplates();
  return prisma.projectTemplate.findMany({ orderBy: [{ pillar: "asc" }, { name: "asc" }] });
}

export async function createProjectFromTemplate(input: { templateId: string; title?: string; slug?: string }) {
  const template = await prisma.projectTemplate.findUnique({ where: { id: input.templateId } });
  if (!template) throw new Error("Template not found.");
  const pillar = await getPillarBySlug(template.pillar);
  if (!pillar) throw new Error(`Template pillar "${template.pillar}" is not configured.`);

  const fields = asRecord(template.defaultFields);
  const title = input.title?.trim() || textField(fields, "title") || `${template.name} Project`;
  const baseSlug = slugify(input.slug || title) || "template-project";
  const section = getPrimaryWorkSection(pillar);
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.workProject.findFirst({ where: { section, slug: { equals: slug, mode: "insensitive" } }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const project = await prisma.workProject.create({
    data: {
      section,
      title,
      slug,
      summary: textField(fields, "summary"),
      description: textField(fields, "description"),
      location: textField(fields, "location"),
      published: false,
      isFeatured: false,
      sortOrder: 0,
      client: textField(fields, "client"),
      projectType: textField(fields, "projectType"),
      scope: textField(fields, "scope"),
      overviewExtended: textField(fields, "overviewExtended"),
      whatWasPhotographed: textField(fields, "whatWasPhotographed"),
      visualApproach: textField(fields, "visualApproach"),
      locationContext: textField(fields, "locationContext"),
      whoIsThisFor: textField(fields, "whoIsThisFor"),
      seoTitle: textField(fields, "seoTitle"),
      metaDescription: textField(fields, "metaDescription"),
      ctaCopy: textField(fields, "ctaCopy"),
      opening: textField(fields, "opening"),
      context: textField(fields, "context"),
      approach: textField(fields, "approach"),
      highlight: textField(fields, "highlight"),
      execution: textField(fields, "execution"),
      closing: textField(fields, "closing"),
      credits: textField(fields, "credits"),
      tags: template.defaultTags,
    },
    include: {
      heroMedia: true,
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  await prisma.aiGeneration.create({
    data: {
      projectId: project.id,
      generationType: "project_template",
      promptMode: "create_from_template",
      inputBrief: {
        templateId: template.id,
        templateName: template.name,
        defaultAISettings: template.defaultAISettings,
        defaultDeliveryStructure: template.defaultDeliveryStructure,
      } as Prisma.InputJsonObject,
      outputJSON: { projectId: project.id, fields, tags: template.defaultTags } as Prisma.InputJsonObject,
      createdBy: "admin_template",
    },
  }).catch(() => null);

  return { project, template };
}

