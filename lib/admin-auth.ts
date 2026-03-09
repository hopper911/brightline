import { cookies } from "next/headers";

export async function getAdminSession() {
  const hasAccess = await hasAdminAccess();
  return hasAccess ? { user: { isAdmin: true } } : null;
}

export async function hasAdminAccess() {
  const jar = await cookies();
  return jar.get("admin_access")?.value === "true";
}
