import { cookies } from "next/headers";

export async function hasAdminAccess() {
  const jar = await cookies();
  return jar.get("admin_access")?.value === "true";
}
