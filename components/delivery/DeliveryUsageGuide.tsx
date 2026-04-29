type DeliveryUsageGuideProps = {
  usageGuideText?: string | null;
  className?: string;
};

const deliverySections = [
  {
    label: "01_FULL_RES",
    title: "Full Resolution",
    copy: "Best for print, archive, brochures, press, and high-quality marketing use.",
  },
  {
    label: "02_WEB_READY",
    title: "Web Ready",
    copy: "Best for websites, online listings, Google Business, blogs, and email campaigns.",
  },
  {
    label: "03_SOCIAL",
    title: "Social",
    copy: "Best for Instagram, LinkedIn, Facebook, stories, reels covers, and digital posts.",
  },
  {
    label: "04_SELECTED_HEROES",
    title: "Selected Heroes",
    copy: "A curated selection of the strongest images recommended for first impressions, cover use, listing thumbnails, and campaigns.",
  },
];

export function DeliveryUsageGuide({
  usageGuideText,
  className = "",
}: DeliveryUsageGuideProps) {
  return (
    <section className={className}>
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6">
        <p className="section-kicker">Usage Guide</p>
        <h2 className="mt-2 font-display text-2xl text-black">
          How to use your final images
        </h2>
        <p className="mt-3 text-sm leading-6 text-black/65">
          {usageGuideText?.trim() ||
            "This delivery includes final edited images organized for professional use. Please avoid heavy filters, distortion, screenshots, or extra compression, as these can reduce image quality."}
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {deliverySections.map((section) => (
            <div
              key={section.label}
              className="rounded-xl border border-black/10 bg-white/80 p-4"
            >
              <p className="text-[11px] uppercase tracking-[0.22em] text-black/45">
                {section.label}
              </p>
              <h3 className="mt-2 text-base font-medium text-black">
                {section.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-black/60">
                {section.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
