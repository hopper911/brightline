import Link from "next/link";
import { loadClientGallerySession } from "@/lib/client-gallery-session";
import { studioClientIdFromGallery } from "@/lib/contracts/client-access";
import { prisma } from "@/lib/prisma";
import PageBackground from "@/components/PageBackground";
import { getBackgroundMediaFromPage, getPublishedWebsitePageBySlug } from "@/lib/website-pages";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Documents · Client · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function ClientDocumentsListPage() {
  const page = await getPublishedWebsitePageBySlug("galleries");
  const { media, poster } = getBackgroundMediaFromPage(page);

  const session = await loadClientGallerySession();
  let rows: Awaited<ReturnType<typeof prisma.generatedDocument.findMany>> = [];
  let notice: string | null = null;

  if (session.ok) {
    const cid = await studioClientIdFromGallery(session.access.gallery);
    if (cid) {
      rows = await prisma.generatedDocument.findMany({
        where: {
          studioClientId: cid,
          status: { in: ["SENT", "VIEWED", "SIGNED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { template: { select: { title: true } } },
      });
    } else {
      notice =
        "Your gallery is not linked to a studio project yet. Open the document link from your email to review and sign.";
    }
  } else {
    notice = "Sign in with your gallery access code to see documents here, or use the secure link from your email.";
  }

  return (
    <>
      <PageBackground media={media} poster={poster} />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-20 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">BRIGHTLINE Photography</p>
        <h1 className="mt-3 font-display text-3xl">Documents</h1>
        {notice && <p className="mt-4 text-sm text-white/70">{notice}</p>}
        <ul className="mt-10 space-y-3">
          {rows.map((d) => (
            <li key={d.id}>
              <Link
                href={`/client/documents/${d.clientToken}`}
                className="block rounded-xl border border-white/15 bg-black/40 px-4 py-4 transition hover:border-white/30"
              >
                <span className="font-medium">{d.title}</span>
                <span className="mt-1 block text-xs text-white/50">{d.status}</span>
              </Link>
            </li>
          ))}
        </ul>
        {rows.length === 0 && !notice && (
          <p className="mt-8 text-sm text-white/60">No documents are ready yet.</p>
        )}
        <p className="mt-12 text-xs text-white/40">
          <Link href="/client" className="text-amber-100/80 hover:text-amber-50">
            Back to client access
          </Link>
        </p>
      </div>
    </>
  );
}
