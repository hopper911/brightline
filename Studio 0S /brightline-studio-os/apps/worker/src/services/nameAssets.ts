import { join } from "node:path";
import { readdirSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { slugify } from "../util/slugify";
import {
  AssetsManifestSchema,
  SelectedManifestSchema,
  type AssetsManifest,
  type ProjectManifest,
  type SelectedManifest,
} from "../schemas/project";
import { getEnv } from "../lib/env";
import { logger } from "../lib/logger";

export function nameAssets(manifest: ProjectManifest): AssetsManifest {
  const { DATA_BASE_PATH } = getEnv();
  const manifestsDir = join(DATA_BASE_PATH, "manifests", manifest.projectId);
  const selectedPath = join(manifestsDir, "selected.manifest.json");

  let selected: SelectedManifest;
  if (existsSync(selectedPath)) {
    const raw = readFileSync(selectedPath, "utf8");
    selected = SelectedManifestSchema.parse(JSON.parse(raw));
  } else {
    const files = readdirSync(manifest.sourceDir).filter(
      (f) => !f.startsWith(".") && !f.toLowerCase().endsWith(".json")
    );
    selected = SelectedManifestSchema.parse({
      selected: files,
    });
    mkdirSync(manifestsDir, { recursive: true });
    writeFileSync(selectedPath, JSON.stringify(selected, null, 2), "utf8");
  }

  const baseSlug = slugify(
    [manifest.category, manifest.projectName, manifest.year?.toString()].filter(Boolean).join(" ")
  );

  let sequence = 1;
  const assets: AssetsManifest["assets"] = selected.selected.map((original) => {
    const padded = String(sequence).padStart(3, "0");
    const finalName = `${baseSlug}-${padded}.webp`;
    sequence += 1;
    return {
      original,
      sequence: sequence - 1,
      finalName,
    };
  });

  const assetsManifest: AssetsManifest = AssetsManifestSchema.parse({ assets });
  const assetsPath = join(manifestsDir, "assets.manifest.json");
  writeFileSync(assetsPath, JSON.stringify(assetsManifest, null, 2), "utf8");

  logger.info("Named assets", {
    projectId: manifest.projectId,
    count: assets.length,
    assetsPath,
  });

  return assetsManifest;
}

