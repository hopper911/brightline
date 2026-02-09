import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";

export const metadata = {
  title: "Admin Settings · Bright Line Photography",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) {
    redirect("/admin/login");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-black/50">
        Admin Settings
      </p>
      <h1 className="font-display mt-4 text-4xl text-black">Settings</h1>
      <p className="mt-3 text-base text-black/70">
        Configure admin access and environment settings in Vercel.
      </p>
    </div>
  );
}
