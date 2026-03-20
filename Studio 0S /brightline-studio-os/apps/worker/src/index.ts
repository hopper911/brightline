#!/usr/bin/env node

import { runProjectPipeline } from "./workflows/runProjectPipeline";
import { logger } from "./lib/logger";

function parseArgs(argv: string[]): { projectId: string | null } {
  const idx = argv.indexOf("--project");
  if (idx !== -1 && argv[idx + 1]) {
    return { projectId: argv[idx + 1] };
  }
  if (argv[2] && !argv[2].startsWith("-")) {
    return { projectId: argv[2] };
  }
  return { projectId: null };
}

async function main() {
  const { projectId } = parseArgs(process.argv);
  if (!projectId) {
    // eslint-disable-next-line no-console
    console.error("Usage: node dist/index.js --project <project-id>");
    process.exit(1);
  }

  try {
    await runProjectPipeline(projectId);
  } catch (err) {
    logger.error("Pipeline failed", {
      projectId,
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

main();

