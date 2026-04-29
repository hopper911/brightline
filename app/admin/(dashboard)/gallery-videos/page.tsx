import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Video deliveries · Admin",
  robots: { index: false, follow: false },
};

export default async function GalleryVideosPage() {
  const ok = await hasAdminAccess();
  if (!ok) redirect("/admin/login");

  const galleries = await prisma.gallery.findMany({
    where: { videos: { some: {} } },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      _count: { select: { videos: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Deliver</p>
      <h1 className="mt-2 font-display text-4xl">Video deliveries</h1>
      <p className="mt-2 text-sm text-white/55">
        Galleries that include a project video for the client portal.
      </p>

      {galleries.length === 0 ? (
        <p className="mt-10 text-sm text-white/50">No galleries with videos yet.</p>
      ) : (
        <ul className="mt-10 space-y-3">
          {galleries.map((g) => (
            <li key={g.id}>
              <Link
                href={`/admin/galleries/${g.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition-colors hover:bg-white/[0.07]"
              >
                <div>
                  <p className="font-medium text-white">{g.title}</p>
                  <p className="text-xs text-white/45">
                    {g.status.replace(/_/g, " ")} · {g._count.videos} video
                    {g._count.videos === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-widest text-white/50">
                  Open →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
