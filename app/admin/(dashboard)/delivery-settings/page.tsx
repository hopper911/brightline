import Link from "next/link";
import { redirect } from "next/navigation";
import DeliveryImageGuide from "@/components/admin/DeliveryImageGuide";
import { hasAdminAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Delivery settings · Admin",
  robots: { index: false, follow: false },
};

export default async function DeliverySettingsPage() {
  const ok = await hasAdminAccess();
  if (!ok) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Deliver</p>
      <h1 className="mt-2 font-display text-4xl">Delivery settings</h1>

      <div className="mt-10 space-y-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-sm leading-7 text-white/70">
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/50">Client delivery packages</h2>
          <p className="mt-2">
            Manage work-linked packages, preset exports, and delivery email from the{" "}
            <Link href="/admin/delivery" className="text-emerald-300 underline">
              Client deliveries
            </Link>{" "}
            hub.
          </p>
          <div className="mt-6">
            <DeliveryImageGuide compact />
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/50">Client portal</h2>
          <p className="mt-2">
            Clients use <strong className="text-white">/client</strong> or{" "}
            <strong className="text-white">/galleries</strong> with their access code. Both routes
            show the same locked experience. Customize the landing copy and background under{" "}
            <Link href="/admin/pages" className="text-emerald-300 underline">
              Website pages → Galleries
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/50">Image delivery</h2>
          <p className="mt-2">
            High-resolution originals stay in private storage. After each upload, run{" "}
            <strong className="text-white">Finalize</strong> in the gallery admin to generate a
            JPEG web-ready derivative for previews and “low-res” downloads. Clients can still
            download full-resolution files when enabled on the access token.
          </p>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/50">Video</h2>
          <p className="mt-2">
            Add project videos from the gallery’s <strong className="text-white">Videos</strong>{" "}
            tab. Optional poster frames improve playback in the client portal.
          </p>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/50">Shortcuts</h2>
          <ul className="mt-2 list-inside list-disc space-y-2">
            <li>
              <Link href="/admin/delivery" className="text-emerald-300 underline">
                Client deliveries (work packages)
              </Link>
            </li>
            <li>
              <Link href="/admin/client-access" className="text-emerald-300 underline">
                Access codes overview
              </Link>
            </li>
            <li>
              <Link href="/admin/gallery-activity" className="text-emerald-300 underline">
                Cross-gallery activity
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
