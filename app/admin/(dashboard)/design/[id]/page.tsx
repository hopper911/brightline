import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import AdminDesignEditClient from "./design-edit-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit design project · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminDesignEditPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");
  return <AdminDesignEditClient />;
}
