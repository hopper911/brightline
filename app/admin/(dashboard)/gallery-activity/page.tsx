import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { GalleryActivityClient } from "./gallery-activity-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Download & view activity · Admin",
  robots: { index: false, follow: false },
};

export default async function GalleryActivityPage() {
  const ok = await hasAdminAccess();
  if (!ok) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Deliver</p>
      <h1 className="mt-2 font-display text-4xl">Gallery activity</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/55">
        Recent client views and downloads across all private galleries (access-token sessions).
      </p>
      <GalleryActivityClient />
    </div>
  );
}
