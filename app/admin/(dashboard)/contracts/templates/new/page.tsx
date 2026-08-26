import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { TemplateEditor } from "../TemplateEditor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New template · Contracts · Admin",
  robots: { index: false, follow: false },
};

export default async function NewContractTemplatePage() {
  if (!(await hasAdminAccess())) redirect("/admin/login");

  return (
    <div className="px-4 py-16">
      <p className="mx-auto max-w-4xl text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts/templates" className="hover:text-white">
          Templates
        </Link>{" "}
        / New
      </p>
      <h1 className="mx-auto mb-10 max-w-4xl font-display text-3xl text-white">New document template</h1>
      <TemplateEditor mode="create" />
    </div>
  );
}
