import Link from "next/link";
import { BRAND, getMailtoLink } from "@/lib/config/brand";

export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-xs uppercase tracking-[0.3em] text-white/50 md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} {BRAND.name}</span>
        <span className="flex flex-wrap items-center gap-4">
          <a href={getMailtoLink()} className="nav-link hover:text-white">
            {BRAND.contact.email}
          </a>
          <Link href="/client" className="btn btn-ghost">
            Client Access
          </Link>
        </span>
      </div>
    </footer>
  );
}
