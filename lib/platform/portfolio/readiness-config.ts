/**
 * Portfolio launch readiness configuration (Phase 26).
 * Thresholds are optional — omit to skip count-based gates.
 */

import "server-only";

import type { TenantSlug } from "@/lib/platform/tenants/types";
import { prisma } from "@/lib/prisma";

const CONFIG_KEY = "portfolio_readiness_config:v1";

export type PortfolioReadinessTenantConfig = {
  /** Minimum published portfolio projects — only enforced when set. */
  minPublishedProjects?: number | null;
  /** Brightline: minimum published projects per visible pillar — only when set. */
  minPublishedPerPillar?: number | null;
  /** Mirotech: category labels that must each have ≥1 published case study — only when non-empty. */
  requiredCategories?: string[];
};

export type PortfolioReadinessConfig = {
  brightline: PortfolioReadinessTenantConfig;
  mirotech: PortfolioReadinessTenantConfig;
};

export const DEFAULT_PORTFOLIO_READINESS_CONFIG: PortfolioReadinessConfig = {
  brightline: {
    minPublishedProjects: null,
    minPublishedPerPillar: null,
  },
  mirotech: {
    minPublishedProjects: null,
    requiredCategories: [],
  },
};

export async function loadPortfolioReadinessConfig(): Promise<PortfolioReadinessConfig> {
  const row = await prisma.siteSetting.findUnique({ where: { key: CONFIG_KEY } });
  if (!row?.value?.trim()) return DEFAULT_PORTFOLIO_READINESS_CONFIG;
  try {
    const parsed = JSON.parse(row.value) as Partial<PortfolioReadinessConfig>;
    return {
      brightline: { ...DEFAULT_PORTFOLIO_READINESS_CONFIG.brightline, ...parsed.brightline },
      mirotech: { ...DEFAULT_PORTFOLIO_READINESS_CONFIG.mirotech, ...parsed.mirotech },
    };
  } catch {
    return DEFAULT_PORTFOLIO_READINESS_CONFIG;
  }
}

export function tenantConfigFor(
  config: PortfolioReadinessConfig,
  tenant: TenantSlug
): PortfolioReadinessTenantConfig {
  return tenant === "brightline" ? config.brightline : config.mirotech;
}
