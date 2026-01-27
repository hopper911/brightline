import Image from "next/image";
import Link from "next/link";

const sections = [
  {
    title: "COMMERCIAL PHOTOGRAPHY",
    subtitle: "Spaces that sell.",
    href: "/portfolio/commercial-photography",
    image: "/images/real-estate.jpg",
    align: "left",
  },
  {
    title: "HOSPITALITY",
    subtitle: "Warm. Inviting. Elevated.",
    href: "/portfolio/hospitality",
    image: "/images/hospitality.jpg",
    align: "right",
  },
  {
    title: "FASHION",
    subtitle: "Style. Elegance. Impact.",
    href: "/portfolio/fashion",
    image: "/images/fashion.jpg",
    align: "left",
  },
] as const;

function Hero() {
  return (
    <section className="relative">
      <div className="relative h-[340px] md:h-[420px] w-full overflow-hidden">
        <Image
          src="/images/hero.jpg"
          alt="Bright Line hero"
          fill
          priority
          className="object-cover opacity-70"
        />
        {/* dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
        <div className="absolute inset-0">
          <div className="mx-auto flex h-full max-w-6xl items-center px-4">
            <div className="max-w-xl">
              <h1 className="text-3xl md:text-5xl font-semibold tracking-wide">
                CAPTURING VISUAL EXCELLENCE
              </h1>
              <p className="mt-3 text-sm md:text-base opacity-80 tracking-wide">
                Photography&nbsp;&nbsp;|&nbsp;&nbsp;Branding
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Band({
  title,
  subtitle,
  href,
  image,
  align,
}: {
  title: string;
  subtitle: string;
  href: string;
  image: string;
  align: "left" | "right";
}) {
  const isLeft = align === "left";

  return (
    <div className="relative overflow-hidden border-t border-white/10">
      <div className="relative h-[180px] md:h-[210px]">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
      </div>

      <div className="absolute inset-0 flex items-center">
        <div
          className={[
            "mx-auto w-full max-w-6xl px-4",
            isLeft ? "justify-start" : "justify-end",
          ].join(" ")}
        >
          <div className={["max-w-md", isLeft ? "text-left" : "text-right ml-auto"].join(" ")}>
            <h2 className="text-xl md:text-2xl font-semibold tracking-widest">
              {title}
            </h2>
            <p className="mt-2 text-sm opacity-80">{subtitle}</p>
            <div className={["mt-4", isLeft ? "" : "flex justify-end"].join(" ")}>
              <Link
                href={href}
                className="inline-flex items-center justify-center rounded border border-white/25 px-4 py-2 text-xs uppercase tracking-widest hover:border-white/50"
              >
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CTA() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-14 text-center">
        <h3 className="text-xl md:text-2xl font-semibold tracking-wide">
          Let&apos;s Create Something Exceptional.
        </h3>
        <p className="mt-2 text-sm opacity-80">Get in touch today.</p>
        <div className="mt-6">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded border border-white/25 px-6 py-3 text-xs uppercase tracking-widest hover:border-white/50"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <Hero />

      <main id="portfolio" className="mx-auto max-w-6xl">
        {sections.map((s) => (
          <Band key={s.title} {...s} />
        ))}
      </main>

      <CTA />

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-6xl px-4 text-xs opacity-60 tracking-widest uppercase">
          © {new Date().getFullYear()} Bright Line Photography
        </div>
      </footer>
    </div>
  );
}
