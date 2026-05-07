import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getPublicR2Url } from "@/lib/r2";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Media · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminMediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;

  const media = await prisma.mediaAsset.findUnique({
    where: { id },
    include: {
      projectMedia: {
        include: { project: { select: { id: true, title: true, slug: true, section: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!media) {
    redirect("/admin/media");
  }

  const key = media.keyFull ?? media.keyThumb ?? null;
  const previewUrl = key ? getPublicR2Url(key) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Link
        href="/admin/media"
        className="text-xs uppercase tracking-[0.25em] text-white/50 hover:text-white/80"
      >
        ← Media
      </Link>

      <p className="mt-6 text-xs uppercase tracking-[0.35em] text-white/50">
        Library
      </p>
      <h1 className="mt-2 font-display text-4xl text-white">Media review</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="aspect-square bg-black/40">
            {previewUrl ? (
              media.kind === "VIDEO" ? (
                <video
                  src={media.keyFull ? getPublicR2Url(media.keyFull) : previewUrl}
                  className="h-full w-full object-contain"
                  controls
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- admin media preview URL from R2
                <img
                  src={previewUrl}
                  alt={media.alt ?? ""}
                  className="h-full w-full object-contain"
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
                No preview available
              </div>
            )}
          </div>
          <div className="space-y-2 px-4 py-4 text-xs text-white/60">
            <p>
              <span className="text-white/40">Kind:</span> {media.kind}
            </p>
            {media.keyFull ? (
              <p className="break-all">
                <span className="text-white/40">Key:</span> {media.keyFull}
              </p>
            ) : null}
            {media.width && media.height ? (
              <p>
                <span className="text-white/40">Size:</span> {media.width}×{media.height}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <form
            action={async (formData: FormData) => {
              "use server";
              const alt = String(formData.get("alt") ?? "").trim();
              await prisma.mediaAsset.update({
                where: { id },
                data: { alt: alt || null },
              });
            }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              Metadata
            </p>
            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                Alt text
              </span>
              <input
                name="alt"
                defaultValue={media.alt ?? ""}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
                placeholder="Describe the image for accessibility / SEO"
              />
            </label>
            <button type="submit" className="btn btn-primary mt-4">
              Save
            </button>
          </form>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              Used in
            </p>
            {media.projectMedia.length === 0 ? (
              <p className="mt-3 text-sm text-white/60">Not linked to any project.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {media.projectMedia.map((pm) => (
                  <li key={`${pm.projectId}:${pm.mediaId}`}>
                    <Link
                      href={`/admin/work/${pm.project.id}`}
                      className="text-sm text-white/80 underline"
                    >
                      {pm.project.title}
                    </Link>
                    <p className="text-xs text-white/40">
                      {pm.project.section} · {pm.project.slug}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

