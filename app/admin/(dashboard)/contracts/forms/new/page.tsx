import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import NewFormTemplatePageClient from "./NewFormTemplatePageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New form · Admin",
  robots: { index: false, follow: false },
};

export default async function NewFormTemplatePage() {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  return (
    <>
      <NewFormTemplatePageClient />
      <p className="mx-auto max-w-lg px-4 pb-8 text-center text-xs text-white/40">
        <Link href="/admin/contracts/forms">Back</Link>
      </p>
    </>
  );
}
