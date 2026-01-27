import Image from "next/image";
import Link from "next/link";

const sections = [
  {
    title: "FASHION",
    subtitle: "Style. Elegance. Impact.",
    href: "/portfolio/fashion",
    image: "/images/fashion.jpg",
    align: "left",
  },
  {
    title: "FOOD",
    subtitle: "Delicious. Inviting. Artful.",
    href: "/portfolio/food",
    image: "/images/food.jpg",
    align: "right",
  },
  {
    title: "COMMERCIAL REAL ESTATE",
    subtitle: "Spaces that sell.",
    href: "/portfolio/commercial-real-estate",
    image: "/images/real-estate.jpg",
    align: "left",
  },
  {
    title: "GRAPHIC DESIGN",
    subtitle: "Creative. Strategic. Bold.",
    href: "/portfolio/design",
    image: "/images/design.jpg",
    align: "right",
  },
] as const;

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="tracking-[0.25em] font-semibold text-sm">
          BRIGHT LINE <span className="opacity-70 font-normal">PHOTOGRAPHY</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm uppercase tracking-widest opacity-90">
          <Link href="#portfolio" className="hover:opacity-70">Portfolio</Link>
          <Link href="/services" className="hover:opacity-70">Services</Link>
          <Link href="/about" className="hover:opacity-70">About</Link>
          <Link href="/contact" className="hover:opacity-70">Contact</Link>
        </nav>

        {/* Mobile button (simple, no JS menu yet) */}
        <Link
          href="/contact"
          className="md:hidden rounded border border-white/20 px-3 py-2 text-xs uppercase tracking-widest hover:border-white/40"
        >
          Contact
        </Link>
      </div>
    </header>
  );
}

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
                Photography&nbsp;&nbsp;|&nbsp;&nbsp;Design&nbsp;&nbsp;|&nbsp;&nbsp;Branding
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
      <Nav />
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
