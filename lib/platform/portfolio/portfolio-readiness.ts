/**
 * Site-level portfolio launch readiness (Phase 26).
 */

import "server-only";

import { evaluateBrightlinePortfolioReadiness } from "@/lib/platform/portfolio/evaluate-brightline-readiness";
import { evaluateMirotechPortfolioReadiness } from "@/lib/platform/portfolio/evaluate-mirotech-readiness";
import { loadPortfolioReadinessConfig } from "@/lib/platform/portfolio/readiness-config";
import type { PortfolioReadinessReport } from "@/lib/platform/portfolio/readiness-types";

export async function evaluatePortfolioReadiness(): Promise<PortfolioReadinessReport> {
  const config = await loadPortfolioReadinessConfig();
  const [brightline, mirotech] = await Promise.all([
    evaluateBrightlinePortfolioReadiness(config.brightline),
    evaluateMirotechPortfolioReadiness(config.mirotech),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    brightline,
    mirotech,
  };
}
