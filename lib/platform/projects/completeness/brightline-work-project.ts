import { buildSeoCompletenessChecks, seoChecksToMissing } from "@/lib/platform/projects/completeness/seo";
import type { ProjectCompletenessResult } from "@/lib/platform/projects/types";

export type BrightlineWorkProjectCompletenessInput = {
  title: string;
  slug: string;
  section: string;
  summary: string | null;
  description: string | null;
  heroMediaId: string | null;
  mediaCount: number;
  seoTitle: string | null;
  metaDescription: string | null;
  heroKeyFull?: string | null;
};

type Check = { label: string; passed: boolean };

function scoreFromChecks(checks: Check[]): number {
  if (checks.length === 0) return 100;
  const passed = checks.filter((c) => c.passed).length;
  return Math.round((passed / checks.length) * 100);
}

export function validateBrightlineProjectCompleteness(
  input: BrightlineWorkProjectCompletenessInput
): ProjectCompletenessResult {
  const coreChecks: Check[] = [
    { label: "title", passed: Boolean(input.title?.trim()) },
    { label: "slug", passed: Boolean(input.slug?.trim()) },
    { label: "work section", passed: Boolean(input.section?.trim()) },
    { label: "project summary", passed: Boolean(input.summary?.trim()) },
    {
      label: "hero asset",
      passed: Boolean(input.heroMediaId) || Boolean(input.heroKeyFull?.trim()) || input.mediaCount > 0,
    },
    {
      label: "project body",
      passed: Boolean(input.description?.trim()) || Boolean(input.summary?.trim()),
    },
  ];

  const seoChecks = buildSeoCompletenessChecks({
    seoTitle: input.seoTitle,
    seoDescription: input.metaDescription,
    openGraphAssetKey: input.heroKeyFull,
  });

  const allChecks: Check[] = [
    ...coreChecks,
    ...seoChecks.map((c) => ({ label: c.label, passed: c.passed })),
  ];

  const missing = allChecks.filter((c) => !c.passed).map((c) => c.label);
  const warnings: string[] = [];
  if (!input.description?.trim() && input.summary?.trim()) {
    warnings.push("Extended description is empty — summary only.");
  }

  const score = scoreFromChecks(allChecks);
  const publishCore = coreChecks.every((c) => c.passed);
  const publishSeo = seoChecks.every((c) => c.passed);

  return {
    complete: publishCore && publishSeo,
    score,
    missing,
    warnings,
  };
}
