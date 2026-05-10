import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicR2Url } from "@/lib/r2";
import PackageInteractiveClient from "./PackageInteractiveClient";
import PackagePerformanceTracker from "./PackagePerformanceTracker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PackagePage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;
  const pkg = await prisma.deliveryPackage.findFirst({
    where: { accessToken, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    include: {
      project: true,
      client: true,
      items: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" } },
      invoices: { include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!pkg) notFound();

  const h = await headers();
  await prisma.packageAccessLog.create({
    data: {
      deliveryPackageId: pkg.id,
      eventType: "viewed",
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    },
  }).catch(() => null);
  if (pkg.status === "sent") {
    await prisma.deliveryPackage.update({ where: { id: pkg.id }, data: { status: "viewed" } }).catch(() => null);
  }

  const invoice = pkg.invoices[0] ?? null;
  const invoiceBalanceDue = invoice ? Number(invoice.balanceRemaining) : 0;
  const invoiceIsPaid =
    invoice != null && (invoice.status === "PAID" || invoiceBalanceDue <= 0);
  const showPayNow =
    invoice != null && !invoiceIsPaid && invoiceBalanceDue > 0 && Boolean(invoice.paymentUrl);
  const interactiveItems = pkg.items
    .filter((item) => item.selectedForDelivery && item.variantKey === "")
    .map((item) => {
      const key = item.mediaAsset.keyThumb ?? item.storageKey ?? item.mediaAsset.keyFull;
      return {
        id: item.id,
        group: item.deliveryGroup,
        imageUrl: key ? getPublicR2Url(key) : null,
        altText: item.altText ?? item.mediaAsset.alt ?? "",
        caption: item.clientFacingCaption ?? item.altText ?? "",
        description: item.aiDescription ?? "",
        usageSuggestion: item.usageSuggestion ?? "",
        imagePurpose: item.imagePurpose ?? "",
        bestUseCase: item.aiBestUseCase ?? "",
        useCaseReasoning: item.aiUseCaseReasoning ?? "",
        licensedUsageTypes: item.licensedUsageTypes,
        licensingNotes: item.licensingNotes ?? "",
        licenseExpiresAt: item.licenseExpiresAt?.toISOString() ?? null,
      };
    });
  return (
    <main className="min-h-screen bg-[#111] px-4 py-12 text-white">
      <PackagePerformanceTracker accessToken={accessToken} />
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.35em] text-white/45">BRIGHTLINE PHOTOGRAPHY</p>
        <h1 className="mt-4 font-display text-4xl">{pkg.title}</h1>
        {pkg.deliveryMessage?.trim() ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">{pkg.deliveryMessage.trim()}</p>
        ) : (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            Bright Line delivers a ready-to-use visual system, not just a folder of images.
          </p>
        )}
        <p className="mt-2 text-sm text-white/45">{pkg.client?.companyName ?? pkg.project.client ?? "Client package"}</p>
        {pkg.usageRights?.trim() ? (
          <section className="mt-8 max-w-2xl rounded-xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-white/70">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/45">Usage &amp; rights</h2>
            <p className="mt-3 whitespace-pre-wrap">{pkg.usageRights.trim()}</p>
          </section>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black"
            href={`/api/package/${accessToken}/download-zip`}
          >
            Download all images (ZIP)
          </a>
          <a className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black" href={`/api/package/${accessToken}/manifest`}>
            Download manifest JSON
          </a>
          {invoice ? (
            <a className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black" href={`/api/package/${accessToken}/invoice`}>
              Download invoice PDF
            </a>
          ) : null}
        </div>

        <PackageInteractiveClient
          accessToken={accessToken}
          items={interactiveItems}
          initialMarketingExport={pkg.marketingExportJSON as Record<string, unknown> | null}
          initialStrategyReport={pkg.visualStrategyReportJSON as Record<string, unknown> | null}
        />

        {invoice ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Invoice #{invoice.invoiceNumber}</h2>
                <p className="mt-1 text-sm text-white/55">
                  {invoice.client.companyName} · {invoice.status}
                </p>
              </div>
              {invoiceIsPaid ? (
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                  Paid
                </span>
              ) : showPayNow && invoice.paymentUrl ? (
                <a
                  className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black"
                  href={invoice.paymentUrl}
                  rel="noreferrer"
                >
                  Pay Now
                </a>
              ) : invoiceBalanceDue > 0 ? (
                <span className="text-xs text-white/45">
                  Payment link not active — your studio will send payment details.
                </span>
              ) : null}
            </div>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              {invoice.lineItems.map((line) => (
                <p key={line.id}>{line.name} · {line.quantity.toString()} x ${line.unitPrice.toString()} · ${line.amount.toString()}</p>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold">Balance due: ${invoice.balanceRemaining.toString()}</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

