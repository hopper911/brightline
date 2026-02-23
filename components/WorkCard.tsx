import Image from "next/image";
import Link from "next/link";

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
      className="group block overflow-hidden rounded-2xl border border-black/10 bg-white/70 lift-card"
    >
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={cover}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover image-zoom"
        />
      </div>
      <div className="p-5">
        {tag && (
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">{tag}</p>
        )}
        <p className="mt-2 font-medium text-black group-hover:text-black/80">
          {title}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-black/50">
          {meta}
        </p>
      </div>
    </Link>
  );
}
