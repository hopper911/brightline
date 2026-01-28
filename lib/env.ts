type EnvSpec = {
  key: string;
  required?: boolean;
};

const requiredServerEnv: EnvSpec[] = [
  { key: "DATABASE_URL", required: true },
];

const optionalServerEnv: EnvSpec[] = [
  { key: "PRISMA_DATABASE_URL" },
  { key: "NEXTAUTH_URL" },
  { key: "NEXTAUTH_SECRET" },
  { key: "ADMIN_SESSION_SECRET" },
  { key: "ADMIN_ACCESS_CODE" },
  { key: "RESEND_API_KEY" },
  { key: "CONTACT_NOTIFY_EMAIL" },
  { key: "R2_ACCESS_KEY_ID" },
  { key: "R2_SECRET_ACCESS_KEY" },
  { key: "R2_BUCKET" },
  { key: "R2_ENDPOINT" },
  { key: "R2_REGION" },
  { key: "S3_ACCESS_KEY_ID" },
  { key: "S3_SECRET_ACCESS_KEY" },
  { key: "S3_BUCKET" },
  { key: "S3_REGION" },
  { key: "S3_ENDPOINT" },
];

function formatMissing(keys: string[]) {
  return keys.map((key) => `"${key}"`).join(", ");
}

export function assertServerEnv() {
  if (process.env.NODE_ENV === "test") return;

  const missing = requiredServerEnv
    .filter((spec) => spec.required && !process.env[spec.key])
    .map((spec) => spec.key);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${formatMissing(missing)}`);
  }

  return {
    required: requiredServerEnv,
    optional: optionalServerEnv,
  };
}
