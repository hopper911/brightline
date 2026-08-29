import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminNav from "../AdminNav";
import { hasAdminAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Authenticated admin shell (nav + main). Sibling route `/admin/login` is NOT wrapped
 * here so unauthenticated users do not trigger Link prefetch to protected routes.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) {
    const h = await headers();
    const path = h.get("x-brightline-admin-pathname")?.trim();
    if (path) {
      redirect(`/admin/login?next=${encodeURIComponent(path)}`);
    }
    redirect("/admin/login");
  }

  return (
    <>
      <a href="#admin-main-content" className="skip-link">
        Skip to main content
      </a>
      <AdminNav />
      <main id="admin-main-content" className="pt-14 lg:pt-0 lg:pl-64">{children}</main>
    </>
  );
}
