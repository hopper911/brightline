import Link from "next/link";
import { BRAND } from "@/lib/config/brand";

export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 text-center text-[0.65rem] uppercase tracking-[0.3em] text-white/65 lg:px-10 md:flex-row md:items-center md:justify-between md:text-left">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <span className="max-w-sm text-[0.6rem] font-normal normal-case tracking-normal leading-relaxed text-white/70">
            Premium photography with structured delivery—assets prepared for web, search, and social.
          </span>
        </div>
        <span className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
          <Link href="/contact?service=general" className="btn btn-primary">
            Contact
          </Link>
          <Link href="/client" className="btn btn-ghost">
            Client Access
          </Link>
        </span>
      </div>
    </footer>
  );
}
