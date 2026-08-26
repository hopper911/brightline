import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { SeedContractsButton } from "./SeedContractsButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contracts settings · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminContractsSettingsPage() {
  if (!(await hasAdminAccess())) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts" className="hover:text-white">
          Contracts
        </Link>{" "}
        / Settings
      </p>
      <h1 className="mt-2 font-display text-3xl">Contracts &amp; forms settings</h1>

      <div className="mt-10 space-y-6 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
        <div>
          <h2 className="font-display text-xl text-white">Scheduling gate</h2>
          <p className="mt-2">
            Projects can store <code className="text-amber-100/90">requireSignedDocumentTypes</code> (JSON array of{" "}
            <code className="text-amber-100/90">DocumentTemplateType</code> values) on the Studio project record. When
            set, Mission Control should block moving to <code className="text-amber-100/90">SCHEDULED</code> until signed
            documents exist for those types. Enforcement is UI-level in MVP—configure per project in the database or
            future project editor field.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-white">Starter templates</h2>
          <p className="mt-2">
            Idempotently insert nine operational draft templates (HTML with attorney-review disclaimer). Safe to run
            multiple times; skips titles that already exist.
          </p>
          <div className="mt-4">
            <SeedContractsButton />
          </div>
        </div>
      </div>
    </div>
  );
}
