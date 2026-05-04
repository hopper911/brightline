import ClientAccessForm from "@/components/ClientAccessForm";
import type { WebsitePage } from "@/lib/website-pages";

const DEFAULT_COPY = {
  eyebrow: "Private delivery",
  title: "Secure image and video delivery.",
  body:
    "Enter your private access code to review proofs, make selections, download low-res web files, download high-res originals, and access project video assets.",
};

export default function ClientAccessLanding({ page }: { page: WebsitePage | null }) {
  const hero =
    page?.blocks.find((block) => block.type === "gallery") ??
    page?.blocks.find((block) => block.type === "hero") ??
    null;
  const cards = page?.blocks.find((block) => block.type === "cards" && block.items.length) ?? null;
  const eyebrow = hero?.eyebrow || page?.eyebrow || DEFAULT_COPY.eyebrow;
  const title = hero?.title || page?.title || DEFAULT_COPY.title;
  const body = hero?.body || page?.body || DEFAULT_COPY.body;

  return (
    <main className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
      <div className="grid min-h-[72vh] gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <section>
          <p className="section-kicker">{eyebrow}</p>
          <h1 className="section-title mt-4">{title}</h1>
          <p className="section-subtitle whitespace-pre-line">{body}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {(cards?.items.length
              ? cards.items
              : [
                  {
                    title: "Private access",
                    body: "Each gallery opens only with a unique access code.",
                    meta: "Secure portal",
                  },
                  {
                    title: "Low + high-res",
                    body: "Download web-ready files and original high-resolution delivery assets.",
                    meta: "Flexible usage",
                  },
                  {
                    title: "Video included",
                    body: "Project video files are delivered alongside your image gallery.",
                    meta: "Image + motion",
                  },
                ]).map((item) => (
              <article key={`${item.title}-${item.meta ?? ""}`} className="rounded-2xl border border-white/10 bg-black/40 p-5">
                {item.meta ? (
                  <p className="text-[0.62rem] uppercase tracking-[0.24em] text-white/45">
                    {item.meta}
                  </p>
                ) : null}
                <h2 className="mt-2 text-base font-medium text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/65">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-white/10 bg-black/55 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Access code</p>
          <h2 className="mt-3 font-display text-2xl text-white">Open your gallery</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Use the private code provided by BRIGHTLINE. Access controls downloads, selection tools, and delivery windows.
          </p>
          <ClientAccessForm />
        </aside>
      </div>
    </main>
  );
}
