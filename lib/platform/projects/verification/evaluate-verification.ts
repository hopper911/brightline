import type { StoredProjectPublishedSnapshot } from "@/lib/platform/projects/published-snapshot";
import type { ProjectCompletenessResult } from "@/lib/platform/projects/types";
import type { ProjectPublishMediaValidation } from "@/lib/platform/projects/validate-publish-media";
import type {
  ProjectVerificationCheck,
  ProjectVerificationNetworkResult,
  PublishedProjectVerificationResult,
} from "@/lib/platform/projects/verification/types";

export type EvaluatePublishedVerificationInput = {
  tenant: "brightline" | "mirotech";
  published: boolean;
  publishTargetOk: boolean;
  title: string;
  slug: string;
  publicPath: string | null;
  routeResolvable: boolean;
  mediaValidation: ProjectPublishMediaValidation;
  completeness: ProjectCompletenessResult;
  publishedSnapshot?: StoredProjectPublishedSnapshot | null;
  publicPageHead?: ProjectVerificationNetworkResult | null;
  heroMediaHead?: ProjectVerificationNetworkResult | null;
};

function pushCheck(
  checks: ProjectVerificationCheck[],
  check: ProjectVerificationCheck
): void {
  checks.push(check);
}

export function evaluatePublishedProjectVerification(
  input: EvaluatePublishedVerificationInput
): PublishedProjectVerificationResult {
  const checkedAt = new Date().toISOString();
  const checks: ProjectVerificationCheck[] = [];

  if (!input.published) {
    return {
      verificationHealthy: false,
      verificationWarning: false,
      verificationFailed: true,
      checkedAt,
      reason: "Project is not published.",
      details: ["not-published"],
      checks: [
        {
          id: "published",
          label: "Project is published",
          passed: false,
          severity: "blocker",
          detail: "Verification only applies to published projects.",
        },
      ],
      publicPath: input.publicPath,
    };
  }

  pushCheck(checks, {
    id: "published",
    label: "Project is published",
    passed: true,
    severity: "blocker",
  });

  pushCheck(checks, {
    id: "tenant-target",
    label: `Tenant publish target (${input.tenant})`,
    passed: input.publishTargetOk,
    severity: "blocker",
    detail: input.publishTargetOk ? undefined : "Publish flag not set for this tenant.",
  });

  pushCheck(checks, {
    id: "public-route",
    label: "Public route resolves",
    passed: input.routeResolvable && Boolean(input.publicPath?.trim()),
    severity: "blocker",
    detail:
      input.routeResolvable && input.publicPath
        ? undefined
        : "Could not resolve canonical public URL for this project.",
  });

  pushCheck(checks, {
    id: "title",
    label: "Title present",
    passed: Boolean(input.title?.trim()),
    severity: "blocker",
  });

  pushCheck(checks, {
    id: "slug",
    label: "Slug present",
    passed: Boolean(input.slug?.trim()),
    severity: "blocker",
  });

  pushCheck(checks, {
    id: "sections",
    label: "Required project content present",
    passed: input.completeness.complete,
    severity: "blocker",
    detail: input.completeness.complete
      ? undefined
      : `Missing: ${input.completeness.missing.slice(0, 4).join(", ")}`,
  });

  pushCheck(checks, {
    id: "media-keys",
    label: "Media asset references present",
    passed: input.mediaValidation.valid,
    severity: "blocker",
    detail: input.mediaValidation.valid
      ? undefined
      : input.mediaValidation.missing.join(", "),
  });

  if (input.heroMediaHead) {
    const severity = input.heroMediaHead.transient ? "warning" : "blocker";
    pushCheck(checks, {
      id: "hero-media-head",
      label: "Hero media resolves (HEAD)",
      passed: input.heroMediaHead.ok,
      severity,
      detail: input.heroMediaHead.detail,
    });
  }

  if (input.publicPageHead) {
    const severity = input.publicPageHead.transient ? "warning" : "blocker";
    pushCheck(checks, {
      id: "public-page-head",
      label: "Public page returns success (HEAD)",
      passed: input.publicPageHead.ok,
      severity,
      detail: input.publicPageHead.detail ?? `HTTP ${input.publicPageHead.statusCode ?? "error"}`,
    });
  }

  if (input.publishedSnapshot) {
    const slugDrift = input.publishedSnapshot.slug !== input.slug;
    const titleDrift = input.publishedSnapshot.title !== input.title;
    if (slugDrift || titleDrift) {
      pushCheck(checks, {
        id: "snapshot-drift",
        label: "Published snapshot matches current slug/title",
        passed: false,
        severity: "warning",
        detail: slugDrift
          ? `Slug changed since publish (${input.publishedSnapshot.slug} → ${input.slug}).`
          : `Title changed since publish.`,
      });
    }
  }

  const failedBlockers = checks.filter((c) => !c.passed && c.severity === "blocker");
  const failedWarnings = checks.filter((c) => !c.passed && c.severity === "warning");

  const verificationFailed = failedBlockers.length > 0;
  const verificationWarning = !verificationFailed && failedWarnings.length > 0;
  const verificationHealthy =
    !verificationFailed && !verificationWarning && checks.every((c) => c.passed);

  const details = [
    ...failedBlockers.map((c) => c.id),
    ...failedWarnings.map((c) => c.id),
  ];

  let reason: string | null = null;
  if (verificationFailed) {
    reason = failedBlockers.map((c) => c.detail ?? c.label).join("; ");
  } else if (verificationWarning) {
    reason = failedWarnings.map((c) => c.detail ?? c.label).join("; ");
  }

  return {
    verificationHealthy,
    verificationWarning,
    verificationFailed,
    checkedAt,
    reason,
    details,
    checks,
    publicPath: input.publicPath,
  };
}
