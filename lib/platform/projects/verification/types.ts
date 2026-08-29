export type ProjectVerificationSeverity = "blocker" | "warning";

export type ProjectVerificationCheck = {
  id: string;
  label: string;
  passed: boolean;
  severity: ProjectVerificationSeverity;
  detail?: string;
};

export type ProjectVerificationNetworkResult = {
  ok: boolean;
  transient: boolean;
  statusCode?: number;
  detail?: string;
};

export type PublishedProjectVerificationResult = {
  verificationHealthy: boolean;
  verificationWarning: boolean;
  verificationFailed: boolean;
  checkedAt: string;
  reason: string | null;
  details: string[];
  checks: ProjectVerificationCheck[];
  publicPath: string | null;
};

export type ProjectVerificationDisplayStatus = "verified" | "warning" | "failed" | "unchecked";

export function verificationDisplayStatus(input: {
  verificationHealthy?: boolean;
  verificationWarning?: boolean;
  verificationFailed?: boolean;
}): ProjectVerificationDisplayStatus {
  if (input.verificationFailed) return "failed";
  if (input.verificationWarning) return "warning";
  if (input.verificationHealthy) return "verified";
  return "unchecked";
}

export function verificationDisplayLabel(status: ProjectVerificationDisplayStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "warning":
      return "Warning";
    case "failed":
      return "Failed";
    default:
      return "Unchecked";
  }
}
