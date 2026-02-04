import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-emails";

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!isAdminEmail(session.user.email)) return null;
  return session;
}
