import { buildSeoCompletenessChecks } from "@/lib/platform/projects/completeness/seo";
import { validateMirotechCaseStudyAgainstTemplate } from "@/lib/platform/projects/mirotech-template-apply";
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
  role?: string | null;
  projectDisclaimer?: string | null;
  sectionTitles?: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishMirotech: boolean;
  templateId?: string | null;
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

  if (input.templateId) {
    coreChecks.push({
      label: "role (template)",
      passed: Boolean(input.role?.trim()),
    });
  }

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

  if (input.templateId) {
    const templateResult = validateMirotechCaseStudyAgainstTemplate(input.templateId, {
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      status: input.status,
      heroImage: input.heroImage,
      thumbnailImage: input.thumbnailImage,
      sectionCount: input.sectionCount,
      challenge: input.challenge,
      outcome: input.outcome,
      role: input.role,
      projectDisclaimer: input.projectDisclaimer,
      sectionTitles: input.sectionTitles,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      publishMirotech: input.publishMirotech,
    });
    if (templateResult) {
      for (const w of templateResult.warnings) {
        warnings.push(w);
      }
      for (const sectionTitle of templateResult.missingSections) {
        const label = `template section: ${sectionTitle}`;
        if (!missing.includes(label)) {
          missing.push(label);
          allChecks.push({ label, passed: false });
        }
      }
    }
  }

  const score = scoreFromChecks(allChecks);
  const publishCore = coreChecks.every((c) => c.passed);
  const publishSeo = seoChecks.every((c) => c.passed);
  const templateSectionMissing = missing.some((m) => m.startsWith("template section:"));

  return {
    complete: publishCore && publishSeo && !templateSectionMissing,
    score,
    missing,
    warnings,
  };
}

// Alias requested in phase prompt
export const validateMirotechProjectCompletenessAlias = validateMirotechProjectCompleteness;
