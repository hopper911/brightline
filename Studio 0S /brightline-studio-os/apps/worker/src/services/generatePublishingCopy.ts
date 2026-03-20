import { join } from "node:path";
import { writeFileSync } from "node:fs";
import type { AssetsManifest, ProjectManifest } from "../schemas/project";
import { PublishDraftSchema, type PublishDraft } from "../schemas/project";
import { getEnv } from "../lib/env";
import { logger } from "../lib/logger";

export async function generatePublishingCopy(
  manifest: ProjectManifest,
  assets: AssetsManifest
): Promise<PublishDraft> {
  const { DATA_BASE_PATH } = getEnv();

  // For now, use a simple deterministic template instead of calling an LLM.
  const title = `${manifest.projectName} — ${manifest.location ?? ""}`.trim();
  const overview = `Architecture photography project for ${manifest.clientName ?? "client"}, shot in ${
    manifest.location ?? "unspecified location"
  }.`;
  const seoDescription = `Portfolio project: ${manifest.projectName} in ${
    manifest.location ?? "unspecified location"
  }. Professional photography by Bright Line Studio.`;
  const tags = [manifest.category, manifest.websiteSection ?? manifest.category].filter(Boolean);

  const assetsCopy = assets.assets.map((a) => ({
    finalName: a.finalName,
    altText: `${manifest.projectName} — view ${a.sequence} in ${manifest.location ?? "project"}`,
  }));

  const draft: PublishDraft = PublishDraftSchema.parse({
    projectId: manifest.projectId,
    title,
    overview,
    seoDescription,
    tags,
    assets: assetsCopy,
  });

  const manifestsDir = join(DATA_BASE_PATH, "manifests", manifest.projectId);
  const draftPath = join(manifestsDir, "publish-draft.json");
  writeFileSync(draftPath, JSON.stringify(draft, null, 2), "utf8");

  logger.info("Generated publishing copy", { projectId: manifest.projectId, draftPath });

  return draft;
}

