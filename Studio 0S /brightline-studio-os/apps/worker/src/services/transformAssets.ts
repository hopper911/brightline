import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";
import type { AssetsManifest, ProjectManifest } from "../schemas/project";
import { getEnv } from "../lib/env";
import { logger } from "../lib/logger";

export async function transformAssets(
  manifest: ProjectManifest,
  assets: AssetsManifest,
  opts?: { force?: boolean }
): Promise<void> {
  const { DATA_BASE_PATH } = getEnv();
  const processedBase = join(DATA_BASE_PATH, "processed", manifest.projectId);
  const fullDir = join(processedBase, "web_full");
  const thumbDir = join(processedBase, "web_thumb");

  mkdirSync(fullDir, { recursive: true });
  mkdirSync(thumbDir, { recursive: true });

  const force = opts?.force ?? false;

  for (const asset of assets.assets) {
    const sourcePath = join(manifest.sourceDir, asset.original);
    const fullOut = join(fullDir, asset.finalName);
    const thumbOut = join(thumbDir, asset.finalName);

    if (!force && existsSync(fullOut) && existsSync(thumbOut)) {
      logger.info("Skipping transform (already exists)", {
        projectId: manifest.projectId,
        original: asset.original,
      });
      continue;
    }

    logger.info("Transforming asset", {
      projectId: manifest.projectId,
      original: asset.original,
      fullOut,
      thumbOut,
    });

    await sharp(sourcePath)
      .resize({ width: 2400, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(fullOut);

    await sharp(sourcePath)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 65 })
      .toFile(thumbOut);
  }
}

