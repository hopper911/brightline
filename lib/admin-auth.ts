import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (!(session.user as { isAdmin?: boolean }).isAdmin) return null;
  return session;
}

export async function hasAdminAccess() {
  const session = await getAdminSession();
  return Boolean(session);
}
