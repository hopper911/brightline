import { z } from "zod";

export const MetadataJsonSchema = z.object({
  projectName: z.string(),
  clientName: z.string().optional(),
  category: z.string(),
  location: z.string().optional(),
  slug: z.string(),
  year: z.number().int().optional(),
  serviceType: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  websiteSection: z.string().optional(),
  notes: z.string().optional(),
});

export type MetadataJson = z.infer<typeof MetadataJsonSchema>;

export const ProjectManifestSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  category: z.string(),
  websiteSection: z.string().nullable(),
  clientName: z.string().nullable(),
  location: z.string().nullable(),
  year: z.number().int().nullable(),
  sourceDir: z.string(),
  status: z.enum(["intake", "processed", "published"]).default("intake"),
});

export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;

export const SelectedManifestSchema = z.object({
  selected: z.array(z.string()),
  rejected: z
    .array(
      z.object({
        file: z.string(),
        reason: z.string().optional(),
      })
    )
    .optional(),
});

export type SelectedManifest = z.infer<typeof SelectedManifestSchema>;

export const AssetEntrySchema = z.object({
  original: z.string(),
  sequence: z.number().int(),
  finalName: z.string(),
  keyFull: z.string().optional(),
  keyThumb: z.string().optional(),
  urlFull: z.string().optional(),
  urlThumb: z.string().optional(),
});

export const AssetsManifestSchema = z.object({
  assets: z.array(AssetEntrySchema),
});

export type AssetsManifest = z.infer<typeof AssetsManifestSchema>;

export const AssetCopySchema = z.object({
  finalName: z.string(),
  altText: z.string(),
});

export const PublishDraftSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  overview: z.string(),
  seoDescription: z.string(),
  tags: z.array(z.string()),
  assets: z.array(AssetCopySchema),
});

export type PublishDraft = z.infer<typeof PublishDraftSchema>;

