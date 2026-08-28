import Link from "next/link";
import { contentAdminEditHref } from "@/lib/studio/access";
import type { StudioContentSection } from "@/lib/studio/content/list-studio-content";

type Props = {
  sections: StudioContentSection[];
  tenant: "brightline" | "mirotech";
};

function lifecycleLabel(value: string): string {
  if (value === "published") return "Published";
  if (value === "archived") return "Archived";
  return "Draft";
}

export function StudioContentTable({ sections, tenant }: Props) {
  if (!sections.length) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-8 text-sm text-white/60">
        No content sections available.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.type}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg text-white">{section.label}</h3>
            {!section.supported ? (
              <span className="text-xs text-amber-200/80">Not migrated</span>
            ) : null}
          </div>
          {section.error ? (
            <p className="mt-2 text-sm text-white/50">{section.error}</p>
          ) : null}
          {section.result.items.length === 0 ? (
            <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/55">
              Empty — no {section.label.toLowerCase()} in this window.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
              {section.result.items.map((item) => {
                const editHref = contentAdminEditHref(tenant, item.ref.type, item.ref.id);
                return (
                  <li key={`${item.ref.type}:${item.ref.id}`} className="bg-white/[0.03] px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {item.ref.type} · {lifecycleLabel(item.lifecycle)}
                          {item.slug ? ` · ${item.slug}` : ""}
                        </p>
                        {item.operational?.pillarSlug ? (
                          <p className="mt-1 text-xs text-white/40">Pillar: {item.operational.pillarSlug}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {item.publicPath ? (
                          <a
                            href={item.publicPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded border border-white/15 px-2 py-1 text-white/70 hover:text-white"
                          >
                            Public ↗
                          </a>
                        ) : null}
                        {editHref ? (
                          <Link
                            href={editHref}
                            className="rounded border border-white/15 px-2 py-1 text-white/70 hover:text-white"
                          >
                            Edit in admin
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {section.result.nextCursor ? (
            <p className="mt-2 text-xs text-white/45">More results available — pagination cursor supported.</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
