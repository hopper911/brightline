import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import DeliveryHubClient from "./DeliveryHubClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Client deliveries · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDeliveryHubPage() {
  const ok = await hasAdminAccess();
  if (!ok) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Deliver</p>
      <h1 className="mt-2 font-display text-4xl">Client deliveries</h1>
      <p className="mt-3 max-w-2xl text-sm text-white/60">
        Work-project delivery packages, private client links, and preset exports. Prepare delivery
        detail in the{" "}
        <Link href="/admin/work" className="text-emerald-300 underline hover:text-emerald-200">
          work
        </Link>{" "}
        editor.
      </p>

      <div className="mt-10">
        <DeliveryHubClient />
      </div>
    </div>
  );
}
