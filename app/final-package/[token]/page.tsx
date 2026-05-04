import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DELIVERY_GROUP_DEFINITIONS, DELIVERY_GROUPS } from "@/lib/delivery/package";
import { getPublicR2Url } from "@/lib/r2";

export const dynamic = "force-dynamic";

export default async function FinalPackagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = await prisma.workProject.findUnique({
    where: { finalPackageToken: token },
    include: {
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      heroMedia: true,
    },
  });
  if (!project) notFound();

  const invoice = project.attachedInvoiceId
    ? await prisma.studioInvoice.findUnique({
        where: { id: project.attachedInvoiceId },
        include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } } },
      })
    : null;

  const selected = project.media.filter((item) => item.selectedForDelivery);
  const finalImages = selected.length ? selected : project.media.filter((item) => item.media.kind === "IMAGE");

  return (
    <main className="min-h-screen bg-[#111] px-4 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.35em] text-white/45">BRIGHTLINE PHOTOGRAPHY</p>
        <h1 className="mt-4 font-display text-4xl">{project.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          Bright Line delivers a ready-to-use visual system, not just a folder of images.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black" href={`/api/final-package/${token}/manifest`}>
            Download delivery manifest JSON
          </a>
          <a className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black" href={`/api/final-package/${token}/summary-pdf`}>
            Download client PDF summary
          </a>
          {invoice ? (
            <a className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black" href={`/api/final-package/${token}/invoice/pdf`}>
              Download invoice PDF
            </a>
          ) : null}
        </div>

        <section className="mt-12 grid gap-6">
          {DELIVERY_GROUPS.map((group) => {
            const images = finalImages.filter((item) => (item.deliveryGroup ?? "archive") === group);
            if (!images.length) return null;
            return (
              <div key={group} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold capitalize">{group}</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-white/55">{DELIVERY_GROUP_DEFINITIONS[group]}</p>
                  </div>
                  <span className="text-xs text-white/45">{images.length} image(s)</span>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((item) => {
                    const key = item.media.keyThumb ?? item.media.keyFull;
                    return (
                      <article key={item.mediaId} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                        {key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getPublicR2Url(key)} alt={item.media.alt ?? ""} className="h-44 w-full object-cover" />
                        ) : null}
                        <div className="p-3">
                          <p className="text-sm text-white/80">{item.clientFacingCaption || item.media.alt || "Final delivery image"}</p>
                          {item.usageSuggestion ? <p className="mt-2 text-xs leading-5 text-white/50">{item.usageSuggestion}</p> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {invoice ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold">Invoice #{invoice.invoiceNumber}</h2>
            <p className="mt-1 text-sm text-white/55">{invoice.client.companyName} · {invoice.status}</p>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              {invoice.lineItems.map((line) => (
                <p key={line.id}>{line.name} · {line.quantity.toString()} × ${line.unitPrice.toString()} · ${line.amount.toString()}</p>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold">Balance due: ${invoice.balanceRemaining.toString()}</p>
          </section>
        ) : null}

        <footer className="mt-14 border-t border-white/10 pt-6 text-xs text-white/40">
          <Link href="/" className="hover:text-white">BRIGHTLINE Photography</Link>
        </footer>
      </div>
    </main>
  );
}

