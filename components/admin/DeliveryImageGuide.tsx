import { DELIVERY_PRESETS } from "@/lib/delivery/presets";

export default function DeliveryImageGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-4" : "space-y-8"}>
      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-white/50">Export presets</h3>
        <p className="mt-2 text-sm text-white/60">
          Standard sizes for web, hero, grid, thumbnails, and social. Use{" "}
          <strong className="text-white/90">Generate exports</strong> on a delivery package to render
          derivatives to R2.
        </p>
      </div>
      <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
        {DELIVERY_PRESETS.map((p) => (
          <li key={p.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/90">{p.label}</p>
              <p className="text-xs text-white/50">{p.description}</p>
              <p className="mt-1 font-mono text-[11px] text-white/40">{p.folderPath}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-white/55">
              {p.kind === "long_edge" ? (
                <span>{p.longEdge}px long edge</span>
              ) : (
                <span>
                  {p.width}×{p.height}px · {p.aspectRatioLabel}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
