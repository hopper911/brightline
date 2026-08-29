export type SeoCompletenessInput = {
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  openGraphAssetKey?: string | null;
};

export type SeoCompletenessCheck = {
  key: string;
  label: string;
  passed: boolean;
};

export function buildSeoCompletenessChecks(input: SeoCompletenessInput): SeoCompletenessCheck[] {
  return [
    {
      key: "seoTitle",
      label: "SEO title",
      passed: Boolean(input.seoTitle?.trim()),
    },
    {
      key: "seoDescription",
      label: "SEO description",
      passed: Boolean(input.seoDescription?.trim()),
    },
    {
      key: "openGraphAsset",
      label: "Open Graph image",
      passed: Boolean(input.openGraphAssetKey?.trim()),
    },
  ];
}

export function seoChecksToMissing(checks: SeoCompletenessCheck[]): string[] {
  return checks.filter((c) => !c.passed).map((c) => c.label);
}
