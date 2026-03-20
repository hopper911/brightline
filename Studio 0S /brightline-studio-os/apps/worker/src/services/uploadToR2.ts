import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import type { AssetsManifest, ProjectManifest } from "../schemas/project";
import { uploadObject, getPublicUrl } from "../clients/r2";
import { getEnv } from "../lib/env";
import { logger } from "../lib/logger";

export async function uploadToR2(
  manifest: ProjectManifest,
  assets: AssetsManifest
): Promise<AssetsManifest> {
  const { DATA_BASE_PATH } = getEnv();
  const processedBase = join(DATA_BASE_PATH, "processed", manifest.projectId);
  const fullDir = join(processedBase, "web_full");
  const thumbDir = join(processedBase, "web_thumb");

  const section = manifest.websiteSection ?? manifest.category;

  const updated = { ...assets, assets: [...assets.assets] };

  for (const asset of updated.assets) {
    const keyBase = `portfolio/${section}/`;
    const keyFull = `${keyBase}web_full/${asset.finalName}`;
    const keyThumb = `${keyBase}web_thumb/${asset.finalName}`;

    const fullPath = join(fullDir, asset.finalName);
    const thumbPath = join(thumbDir, asset.finalName);

    const fullBody = readFileSync(fullPath);
    const thumbBody = readFileSync(thumbPath);

    logger.info("Uploading asset to R2", {
      projectId: manifest.projectId,
      keyFull,
      keyThumb,
    });

    await uploadObject({
      key: keyFull,
      body: fullBody,
      contentType: "image/webp",
    });
    await uploadObject({
      key: keyThumb,
      body: thumbBody,
      contentType: "image/webp",
    });

    asset.keyFull = keyFull;
    asset.keyThumb = keyThumb;
    asset.urlFull = getPublicUrl(keyFull);
    asset.urlThumb = getPublicUrl(keyThumb);
  }

  const manifestsDir = join(DATA_BASE_PATH, "manifests", manifest.projectId);
  const assetsPath = join(manifestsDir, "assets.manifest.json");
  writeFileSync(assetsPath, JSON.stringify(updated, null, 2), "utf8");

  return updated;
}

