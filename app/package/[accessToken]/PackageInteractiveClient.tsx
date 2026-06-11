"use client";

import { useMemo, useState } from "react";

type ClientPackageItem = {
  id: string;
  group: string;
  imageUrl: string | null;
  altText: string;
  caption: string;
  description: string;
  usageSuggestion: string;
  imagePurpose: string;
  bestUseCase: string;
  useCaseReasoning: string;
  licensedUsageTypes: string[];
  licensingNotes: string;
  licenseExpiresAt: string | null;
};

type GeneratedBlock = Record<string, unknown>;

const FILTERS = ["all", "hero", "web", "print", "social", "details"] as const;

function renderGeneratedBlock(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n\n");
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return Object.values(value).map(renderGeneratedBlock).filter(Boolean).join("\n\n");
  return "";
}

export default function PackageInteractiveClient({
  accessToken,
  items,
  initialMarketingExport,
  initialStrategyReport,
}: {
  accessToken: string;
  items: ClientPackageItem[];
  initialMarketingExport: GeneratedBlock | null;
  initialStrategyReport: GeneratedBlock | null;
}) {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [feedbackByItem, setFeedbackByItem] = useState<Record<string, string>>({});
  const [marketingExport, setMarketingExport] = useState<GeneratedBlock | null>(initialMarketingExport);
  const [strategyReport, setStrategyReport] = useState<GeneratedBlock | null>(initialStrategyReport);
  const [loadingContent, setLoadingContent] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.group === activeFilter || item.bestUseCase === activeFilter || item.licensedUsageTypes.includes(activeFilter));
  }, [activeFilter, items]);

  async function copyText(label: string, text: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function sendFeedback(itemId: string, eventType: string, comment?: string) {
    await fetch(`/api/package/${accessToken}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, eventType, comment }),
    });
    if (comment) setFeedbackByItem((current) => ({ ...current, [itemId]: "" }));
  }

  async function generateContent(kind: "marketing-export" | "visual-strategy-report") {
    setLoadingContent(kind);
    try {
      const response = await fetch(`/api/package/${accessToken}/${kind}`, { method: "POST" });
      const data = await response.json();
      if (data.export) setMarketingExport(data.export);
      if (data.report) setStrategyReport(data.report);
    } finally {
      setLoadingContent(null);
    }
  }

  return (
    <div className="mt-12 space-y-10">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recommended Usage</h2>
            <p className="mt-1 text-xs leading-5 text-white/55">
              Filter the final images by intended use, copy ready-to-use captions, and mark feedback directly on the package.
            </p>
          </div>
          {copied ? <span className="text-xs text-emerald-300">{copied} copied</span> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
                activeFilter === filter ? "border-white bg-white text-black" : "border-white/15 text-white/65 hover:border-white/45"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => {
          const licenseLabel = item.licensedUsageTypes.length
            ? `Licensed for ${item.licensedUsageTypes.join(" + ")} use`
            : "Usage license pending";
          return (
            <article key={item.id} data-package-item-id={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              {item.imageUrl ? (
                <div className="relative image-guard-overlay">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.altText} draggable={false} className="h-52 w-full object-cover" />
                </div>
              ) : null}
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-sm text-white/85">{item.caption || item.altText || "Final delivery image"}</p>
                  <p className="mt-2 text-xs leading-5 text-white/50">{item.usageSuggestion || item.imagePurpose || "Recommended for campaign and brand use."}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/55">
                  <p className="font-medium text-white/75">{licenseLabel}</p>
                  {item.licensingNotes ? <p className="mt-1">{item.licensingNotes}</p> : null}
                  {item.licenseExpiresAt ? <p className="mt-1">Expires {new Date(item.licenseExpiresAt).toLocaleDateString()}</p> : null}
                </div>
                {item.bestUseCase || item.useCaseReasoning ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/55">
                    {item.bestUseCase ? <p className="font-medium capitalize text-white/75">Best use: {item.bestUseCase}</p> : null}
                    {item.useCaseReasoning ? <p className="mt-1">{item.useCaseReasoning}</p> : null}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <a className="rounded border border-white/15 px-3 py-2 text-center text-xs hover:bg-white hover:text-black" href={`/api/package/${accessToken}/items/${item.id}/download?variant=web`}>
                    Download Web Version
                  </a>
                  <a className="rounded border border-white/15 px-3 py-2 text-center text-xs hover:bg-white hover:text-black" href={`/api/package/${accessToken}/items/${item.id}/download?variant=print`}>
                    Download Print Version
                  </a>
                  <button type="button" className="rounded border border-white/15 px-3 py-2 text-xs hover:bg-white hover:text-black" onClick={() => copyText("Caption", item.caption)}>
                    Copy Caption
                  </button>
                  <button type="button" className="rounded border border-white/15 px-3 py-2 text-xs hover:bg-white hover:text-black" onClick={() => copyText("Description", item.description || item.usageSuggestion)}>
                    Copy Description
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded bg-emerald-400/15 px-3 py-1.5 text-xs text-emerald-100" onClick={() => sendFeedback(item.id, "approved")}>
                    Approve
                  </button>
                  <button type="button" className="rounded bg-amber-400/15 px-3 py-1.5 text-xs text-amber-100" onClick={() => sendFeedback(item.id, "flagged")}>
                    Flag
                  </button>
                  <button type="button" className="rounded bg-white/10 px-3 py-1.5 text-xs text-white/75" onClick={() => sendFeedback(item.id, "revision_requested", feedbackByItem[item.id])}>
                    Request revision
                  </button>
                </div>
                <textarea
                  value={feedbackByItem[item.id] ?? ""}
                  onChange={(event) => setFeedbackByItem((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Add a note for Bright Line..."
                  className="min-h-20 w-full rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white outline-none placeholder:text-white/30"
                />
                <button type="button" className="text-xs text-white/45 underline hover:text-white" onClick={() => sendFeedback(item.id, "commented", feedbackByItem[item.id])}>
                  Send comment
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <GeneratedPanel
          title="One-Click Marketing Export"
          description="Ready-to-copy Instagram, LinkedIn, website, listing, and email copy based on this package."
          actionLabel={marketingExport ? "Refresh marketing export" : "Generate marketing export"}
          loading={loadingContent === "marketing-export"}
          data={marketingExport}
          onGenerate={() => generateContent("marketing-export")}
          onCopy={copyText}
        />
        <GeneratedPanel
          title="Visual Strategy Report"
          description="Strategic guidance on what works visually, where to place images, what is missing, and what to shoot next."
          actionLabel={strategyReport ? "Refresh strategy report" : "Generate strategy report"}
          loading={loadingContent === "visual-strategy-report"}
          data={strategyReport}
          onGenerate={() => generateContent("visual-strategy-report")}
          onCopy={copyText}
        />
      </section>
    </div>
  );
}

function GeneratedPanel({
  title,
  description,
  actionLabel,
  loading,
  data,
  onGenerate,
  onCopy,
}: {
  title: string;
  description: string;
  actionLabel: string;
  loading: boolean;
  data: GeneratedBlock | null;
  onGenerate: () => void;
  onCopy: (label: string, text: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-white/55">{description}</p>
      <button type="button" onClick={onGenerate} disabled={loading} className="mt-4 rounded border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black disabled:opacity-50">
        {loading ? "Generating..." : actionLabel}
      </button>
      {data ? (
        <div className="mt-5 space-y-4">
          {Object.entries(data).map(([key, value]) => {
            const text = renderGeneratedBlock(value);
            if (!text) return null;
            return (
              <div key={key} className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">{key.replace(/([A-Z])/g, " $1")}</h3>
                  <button type="button" className="text-xs text-white/45 underline hover:text-white" onClick={() => onCopy(key, text)}>
                    Copy
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/75">{text}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

