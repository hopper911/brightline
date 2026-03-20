import { logger } from "../lib/logger";
import { loadProject } from "../services/loadProject";
import { nameAssets } from "../services/nameAssets";
import { transformAssets } from "../services/transformAssets";
import { uploadToR2 } from "../services/uploadToR2";
import { generatePublishingCopy } from "../services/generatePublishingCopy";

export async function runProjectPipeline(projectId: string): Promise<void> {
  logger.info("Starting project pipeline", { projectId });

  const { manifest } = loadProject(projectId);
  const assets = nameAssets(manifest);

  await transformAssets(manifest, assets);
  const uploaded = await uploadToR2(manifest, assets);
  await generatePublishingCopy(manifest, uploaded);

  logger.info("Project pipeline completed", { projectId });
}

