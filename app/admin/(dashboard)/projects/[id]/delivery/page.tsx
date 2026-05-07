import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Studio project delivery · Admin",
  robots: { index: false, follow: false },
};

export default async function StudioProjectDeliveryBridgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ok = await hasAdminAccess();
  if (!ok) redirect("/admin/login");

  const { id: studioProjectId } = await params;
  const studio = await prisma.studioProject.findUnique({
    where: { id: studioProjectId },
    select: {
      id: true,
      title: true,
      studioClient: { select: { companyName: true } },
    },
  });
  if (!studio) notFound();

  const work = await prisma.workProject.findFirst({
    where: { studioProjectId },
    select: {
      id: true,
      title: true,
      slug: true,
      deliveryPackages: {
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: { id: true, title: true, status: true, accessToken: true, updatedAt: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Studio CMS</p>
      <h1 className="mt-2 font-display text-3xl">Delivery · {studio.title}</h1>
      <p className="mt-2 text-sm text-white/55">
        {studio.studioClient?.companyName ? (
          <span>{studio.studioClient.companyName}</span>
        ) : (
          <span className="text-white/40">No linked studio client name</span>
        )}
      </p>

      {!work ? (
        <div className="mt-10 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-6 text-sm text-amber-100/90">
          <p className="font-medium text-amber-50">No work project linked yet</p>
          <p className="mt-2 text-amber-100/80">
            Client delivery packages hang off a <strong className="text-white">WorkProject</strong>{" "}
            with the same studio link. Create or open the case study in work and ensure{" "}
            <code className="rounded bg-black/30 px-1">studioProjectId</code> is set.
          </p>
          <Link
            href="/admin/work"
            className="mt-4 inline-block rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Go to work
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/50">Linked work</h2>
            <p className="mt-2 text-lg text-white/90">{work.title}</p>
            <Link
              href={`/admin/work/${work.id}`}
              className="mt-4 inline-block rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-400/20"
            >
              Open delivery panel in work editor
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/50">Recent packages</h2>
            {work.deliveryPackages.length === 0 ? (
              <p className="mt-3 text-sm text-white/50">
                No packages yet — create one from the work editor.
              </p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {work.deliveryPackages.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] py-2"
                  >
                    <span className="text-white/85">{p.title}</span>
                    <span className="text-xs text-white/45">{p.status}</span>
                    <a
                      href={`/package/${p.accessToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-300 underline"
                    >
                      View client page
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/delivery"
              className="mt-4 inline-block text-sm text-white/60 underline hover:text-white/80"
            >
              All deliveries hub →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
