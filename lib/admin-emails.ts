function normalizeEmails(input: string) {
  return input
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return normalizeEmails(raw);
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const allowed = getAdminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}
