import Image from "next/image";
import Link from "next/link";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

type WorkCardProps = {
  href: string;
  cover: string;
  alt: string;
  tag?: string;
  title: string;
  meta?: string;
};

export default function WorkCard({
  href,
  cover,
  alt,
  tag,
  title,
  meta = "View project",
}: WorkCardProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-[var(--card)] shadow-sm backdrop-blur-md transition-[border-color,transform] duration-[var(--motion-fast)] ease-out hover:border-white/25 hover:-translate-y-px"
    >
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={cover}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          quality={85}
          placeholder="blur"
          blurDataURL={BLUR_DATA}
          className="object-cover image-zoom"
        />
      </div>
      <div className="p-5">
        {tag ? (
          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/60">{tag}</p>
        ) : null}
        <p
          className={`font-medium text-base text-white ${tag ? "mt-2" : ""} group-hover:text-white/95`}
        >
          {title}
        </p>
        <p className="mt-2 text-[0.6rem] uppercase tracking-[0.2em] text-white/70">
          {meta}
        </p>
      </div>
    </Link>
  );
}
