import { describe, expect, it } from "vitest";
import {
  buildTenantReadiness,
  scoreFromChecks,
  type PortfolioReadinessCheck,
} from "@/lib/platform/portfolio/readiness-types";

describe("portfolio readiness types", () => {
  it("scores checks as percentage passed", () => {
    const checks: PortfolioReadinessCheck[] = [
      { id: "a", label: "A", passed: true, severity: "blocker" },
      { id: "b", label: "B", passed: true, severity: "blocker" },
      { id: "c", label: "C", passed: false, severity: "warning" },
    ];
    expect(scoreFromChecks(checks)).toBe(67);
  });

  it("marks not ready when blockers fail", () => {
    const result = buildTenantReadiness("mirotech", "MiroTech Portfolio Readiness", [
      { id: "hero", label: "Hero media", passed: false, severity: "blocker", detail: "2 missing" },
      { id: "legacy", label: "Legacy fallback", passed: false, severity: "warning", detail: "1 project" },
    ]);
    expect(result.ready).toBe(false);
    expect(result.blockers).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.blockers[0].id).toBe("hero");
  });

  it("marks ready when only warnings fail", () => {
    const result = buildTenantReadiness("brightline", "Brightline Portfolio Readiness", [
      { id: "hero", label: "Hero media", passed: true, severity: "blocker" },
      { id: "legacy", label: "Legacy fallback", passed: false, severity: "warning", detail: "1 project" },
    ]);
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });
});
