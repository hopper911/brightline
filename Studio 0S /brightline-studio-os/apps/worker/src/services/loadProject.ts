import { join } from "node:path";
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { getEnv } from "../lib/env";
import { logger } from "../lib/logger";
import {
  MetadataJsonSchema,
  ProjectManifestSchema,
  type MetadataJson,
  type ProjectManifest,
} from "../schemas/project";

export function loadProject(projectId: string): {
  metadata: MetadataJson;
  manifest: ProjectManifest;
  projectDir: string;
} {
  const { DATA_BASE_PATH } = getEnv();
  const incomingBase = join(DATA_BASE_PATH, "incoming");
  const manifestsBase = join(DATA_BASE_PATH, "manifests");

  const projectDir = join(incomingBase, projectId);
  const exportsDir = join(projectDir, "exports");
  const metadataPath = join(projectDir, "metadata.json");

  if (!existsSync(projectDir)) {
    throw new Error(`Project directory not found: ${projectDir}`);
  }
  if (!existsSync(exportsDir)) {
    throw new Error(`Exports directory not found: ${exportsDir}`);
  }
  if (!existsSync(metadataPath)) {
    throw new Error(`metadata.json not found in ${projectDir}`);
  }

  const raw = readFileSync(metadataPath, "utf8");
  const metadata = MetadataJsonSchema.parse(JSON.parse(raw));

  const manifestDir = join(manifestsBase, projectId);
  if (!existsSync(manifestDir)) {
    mkdirSync(manifestDir, { recursive: true });
  }

  const manifest: ProjectManifest = ProjectManifestSchema.parse({
    projectId,
    projectName: metadata.projectName,
    category: metadata.category,
    websiteSection: metadata.websiteSection ?? null,
    clientName: metadata.clientName ?? null,
    location: metadata.location ?? null,
    year: metadata.year ?? null,
    sourceDir: exportsDir,
    status: "intake",
  });

  const manifestPath = join(manifestDir, "project.manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  logger.info("Loaded project", { projectId, projectDir, exportsDir, manifestPath });

  // Simple check that there is at least one file in exports
  const files = readdirSync(exportsDir).filter((f) => !f.startsWith("."));
  if (files.length === 0) {
    throw new Error(`No export files found in ${exportsDir}`);
  }

  return { metadata, manifest, projectDir };
}

