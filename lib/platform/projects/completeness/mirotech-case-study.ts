import { buildSeoCompletenessChecks } from "@/lib/platform/projects/completeness/seo";
import type { ProjectCompletenessResult } from "@/lib/platform/projects/types";

export type MirotechCaseStudyCompletenessInput = {
  title: string;
  slug: string;
  summary: string;
  status: string;
  heroImage: string | null;
  thumbnailImage: string | null;
  sectionCount: number;
  challenge: string | null;
  outcome: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishMirotech: boolean;
};

type Check = { label: string; passed: boolean };

function scoreFromChecks(checks: Check[]): number {
  if (checks.length === 0) return 100;
  const passed = checks.filter((c) => c.passed).length;
  return Math.round((passed / checks.length) * 100);
}

export function validateMirotechProjectCompleteness(
  input: MirotechCaseStudyCompletenessInput
): ProjectCompletenessResult {
  const coreChecks: Check[] = [
    { label: "title", passed: Boolean(input.title?.trim()) },
    { label: "slug", passed: Boolean(input.slug?.trim()) },
    { label: "project summary", passed: Boolean(input.summary?.trim()) },
    {
      label: "hero asset",
      passed: Boolean(input.heroImage?.trim()) || Boolean(input.thumbnailImage?.trim()),
    },
    {
      label: "case study sections",
      passed: input.sectionCount > 0 || Boolean(input.challenge?.trim()) || Boolean(input.outcome?.trim()),
    },
    { label: "outcome or challenge", passed: Boolean(input.outcome?.trim()) || Boolean(input.challenge?.trim()) },
    { label: "publishing target (Mirotech)", passed: input.publishMirotech },
  ];

  const seoChecks = buildSeoCompletenessChecks({
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    openGraphAssetKey: input.heroImage ?? input.thumbnailImage,
  });

  const allChecks: Check[] = [
    ...coreChecks,
    ...seoChecks.map((c) => ({ label: c.label, passed: c.passed })),
  ];

  const missing = allChecks.filter((c) => !c.passed).map((c) => c.label);
  const warnings: string[] = [];
  if (input.status === "REVIEW" && missing.length > 0) {
    warnings.push("Case study is in review but publish prerequisites are incomplete.");
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

// Alias requested in phase prompt
export const validateMirotechProjectCompletenessAlias = validateMirotechProjectCompleteness;
