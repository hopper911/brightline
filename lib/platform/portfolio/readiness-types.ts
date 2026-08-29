import type { TenantSlug } from "@/lib/platform/tenants/types";

export type PortfolioReadinessSeverity = "blocker" | "warning";

export type PortfolioReadinessFinding = {
  id: string;
  label: string;
  severity: PortfolioReadinessSeverity;
  detail?: string;
};

export type PortfolioReadinessCheck = {
  id: string;
  label: string;
  passed: boolean;
  severity: PortfolioReadinessSeverity;
  detail?: string;
};

export type TenantPortfolioReadiness = {
  tenant: TenantSlug;
  title: string;
  score: number;
  ready: boolean;
  blockers: PortfolioReadinessFinding[];
  warnings: PortfolioReadinessFinding[];
  checks: PortfolioReadinessCheck[];
};

export type PortfolioReadinessReport = {
  generatedAt: string;
  brightline: TenantPortfolioReadiness;
  mirotech: TenantPortfolioReadiness;
};

export function scoreFromChecks(checks: PortfolioReadinessCheck[]): number {
  if (checks.length === 0) return 100;
  const passed = checks.filter((c) => c.passed).length;
  return Math.round((passed / checks.length) * 100);
}

export function buildTenantReadiness(
  tenant: TenantSlug,
  title: string,
  checks: PortfolioReadinessCheck[]
): TenantPortfolioReadiness {
  const blockers: PortfolioReadinessFinding[] = [];
  const warnings: PortfolioReadinessFinding[] = [];

  for (const check of checks) {
    if (check.passed) continue;
    const finding: PortfolioReadinessFinding = {
      id: check.id,
      label: check.label,
      severity: check.severity,
      detail: check.detail,
    };
    if (check.severity === "blocker") blockers.push(finding);
    else warnings.push(finding);
  }

  return {
    tenant,
    title,
    score: scoreFromChecks(checks),
    ready: blockers.length === 0,
    blockers,
    warnings,
    checks,
  };
}
