const DEV_FALLBACK_ADMIN_CODE = "dev-admin";

export function getAdminAccessCode() {
  if (process.env.ADMIN_ACCESS_CODE) return process.env.ADMIN_ACCESS_CODE;
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_ADMIN_CODE;
  return null;
}

export function getAdminSigningKey() {
  return process.env.ADMIN_ACCESS_CODE || process.env.NEXTAUTH_SECRET || getAdminAccessCode();
}
