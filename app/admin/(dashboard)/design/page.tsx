import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import AdminDesignClient from "./design-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Design · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminDesignPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");
  return <AdminDesignClient />;
}
