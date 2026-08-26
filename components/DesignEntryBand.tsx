import Link from "next/link";
import DigitalProjectCard from "@/components/design/DigitalProjectCard";
import {
  getDesignSectionSettings,
  type DesignSectionSettings,
} from "@/lib/design-section-settings";
import { listFeaturedDesignProjects } from "@/lib/queries/design";

/** Compact entry strip used on Work hub / homepage when Design is live. */
export default async function DesignEntryBand({
  variant = "work",
}: {
  variant?: "work" | "home";
}) {
  let settings: DesignSectionSettings;
  try {
    settings = await getDesignSectionSettings();
  } catch {
    return null;
  }
  if (!settings.enabled) return null;
  if (variant === "work" && !settings.showOnWorkHub) return null;
  if (variant === "home" && !settings.showOnHome) return null;

  const featured =
    variant === "home" ? await listFeaturedDesignProjects(3).catch(() => []) : [];

  return (
    <section
      className={
        variant === "home"
          ? "section-pad relative mx-auto max-w-6xl px-6 lg:px-10"
          : "mt-20 border-t border-white/10 pt-14"
      }
    >
      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
        {variant === "home" ? "Design & Digital" : "Also from the studio"}
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="font-display text-2xl text-white md:text-3xl">
            {variant === "home"
              ? "Selected digital work"
              : settings.hubLabel}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {variant === "home"
              ? "Product, UX, and operational systems—kept separate from photography Work, and discoverable when you need them."
              : settings.hubDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {variant === "home" ? (
            <>
              <Link href="/work" className="btn btn-ghost">
                View Photography
              </Link>
              <Link href="/design" className="btn btn-primary">
                Explore Design Work
              </Link>
            </>
          ) : (
            <Link href="/design" className="btn btn-ghost">
              View {settings.hubLabel.toLowerCase()} →
            </Link>
          )}
        </div>
      </div>

      {featured.length > 0 ? (
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {featured.map((project) => (
            <DigitalProjectCard key={project.slug} project={project} variant="compact" />
          ))}
        </div>
      ) : null}

      {variant === "home" ? (
        <div className="mt-12 grid gap-6 border-t border-white/10 pt-10 md:grid-cols-3">
          {[
            {
              title: "Photography",
              body: "Commercial, hospitality, architecture, corporate, and structured image libraries.",
            },
            {
              title: "Design",
              body: "Graphic design, brand systems, presentations, web, UX/UI, and product design.",
            },
            {
              title: "Digital systems",
              body: "Internal tools, portals, dashboards, and workflow automation for real operations.",
            },
          ].map((cap) => (
            <div key={cap.title}>
              <h3 className="font-display text-lg text-white">{cap.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{cap.body}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
