import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) {
    redirect("/admin/login?next=%2Fadmin%2Fprojects");
  }
  return children;
}
