import Link from "next/link";
import type { StudioOpsToolLink } from "@/lib/studio/ops/types";

type Props = {
  title: string;
  description: string;
  links: StudioOpsToolLink[];
};

export function StudioOpsLinkGrid({ title, description, links }: Props) {
  return (
    <div>
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60">{description}</p>
      <div className="mt-6 grid gap-3">
        {links.map((link) => {
          const external = link.external || link.href.startsWith("http") || link.href.startsWith("/api/");
          const className =
            "block rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 transition hover:border-white/25 hover:bg-white/[0.07]";
          const body = (
            <>
              <p className="text-base text-white">
                {link.label}
                {external ? " ↗" : ""}
              </p>
              <p className="mt-1 text-sm text-white/55">{link.description}</p>
            </>
          );
          if (external) {
            return (
              <a key={link.href + link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                {body}
              </a>
            );
          }
          return (
            <Link key={link.href + link.label} href={link.href} className={className}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
