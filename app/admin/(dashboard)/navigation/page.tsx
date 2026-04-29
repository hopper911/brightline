import { redirect } from "next/navigation";
import Link from "next/link";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getAdminNav } from "@/lib/admin-nav";
import NavigationEditorClient from "./navigation-editor-client";

export const metadata = {
  title: "Admin sidebar · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminNavigationEditorPage() {
  const ok = await hasAdminAccess();
  if (!ok) redirect("/admin/login");

  const groups = await getAdminNav();
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-black/45">Customize</p>
          <h1 className="section-title text-black/90">Admin sidebar</h1>
          <p className="section-subtitle mt-2 max-w-2xl text-black/60">
            Labels, URLs (must start with <span className="font-mono">/</span>), and visibility for each
            link. Saves to your site settings and applies everywhere the sidebar appears.
          </p>
        </div>
        <Link href="/admin/projects" className="btn btn-ghost shrink-0 text-sm">
          Back to Studio CMS
        </Link>
      </div>
      <NavigationEditorClient initialGroups={groups} />
    </div>
  );
}
