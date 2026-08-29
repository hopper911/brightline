"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SiteNavItem } from "@/lib/site-nav";
import { useFocusTrap } from "@/lib/a11y/use-focus-trap";

const MOBILE_NAV_ID = "site-mobile-nav-dialog";

export default function Navbar({ links }: { links: SiteNavItem[] }) {
  const navLinks = links.filter((link) => link.visible);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastScroll = useRef(0);

  const closeMenu = () => setOpen(false);

  useFocusTrap(open, dialogRef, {
    onEscape: closeMenu,
    restoreFocus: true,
  });

  // Prevent background scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onScroll() {
      const current = window.scrollY;
      setScrolled(current > 12);
      const goingDown = current > lastScroll.current;
      setHidden(goingDown && current > 120 && !open);
      lastScroll.current = current;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/10 transition-transform motion-fast ${
        scrolled ? "bg-[#0b0e12]/80 backdrop-blur-md" : "bg-[#0b0e12]/60"
      } ${hidden ? "-translate-y-full focus-within:translate-y-0" : "translate-y-0"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link
          href="/"
          className="min-w-0 shrink font-display tracking-[0.28em] text-xs uppercase text-white sm:tracking-[0.32em] sm:text-sm"
          onClick={() => setOpen(false)}
        >
          BRIGHTLINE{" "}
          <span className="opacity-60 font-normal text-[10px] tracking-[0.14em] sm:text-[11px] sm:tracking-[0.18em]">
            PHOTOGRAPHY
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-[0.7rem] uppercase tracking-[0.32em] text-white/70">
          {navLinks.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className={l.cta ? "nav-link rounded-full border border-white/30 bg-white/10 px-4 py-2 hover:bg-white/20 hover:text-white hover:border-white/40" : "nav-link hover:text-white"}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls={MOBILE_NAV_ID}
          onClick={() => setOpen(true)}
          className="nav-pill md:hidden inline-flex min-h-11 min-w-[4.5rem] shrink-0 items-center justify-center rounded-full border border-white/20 px-4 py-2 text-[0.7rem] uppercase tracking-[0.28em] text-white/80 hover:border-white/40"
        >
          Menu
        </button>
      </div>

      {/* Mobile overlay + slide-down panel */}
      {open && (
        <div
          ref={dialogRef}
          id={MOBILE_NAV_ID}
          className="md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/60"
            onClick={closeMenu}
            aria-label="Close menu"
          />

          <div
            className="fixed left-0 right-0 top-0 z-[60] border-b border-white/10 bg-[#0b0e12]/95 backdrop-blur"
          >
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              <Link
                href="/"
                className="font-display tracking-[0.32em] text-sm uppercase text-white"
                onClick={() => setOpen(false)}
              >
                BRIGHTLINE{" "}
                <span className="opacity-60 font-normal text-[11px] tracking-[0.18em]">
                  PHOTOGRAPHY
                </span>
              </Link>

              <button
                type="button"
                aria-label="Close menu"
                onClick={closeMenu}
                className="nav-pill inline-flex min-h-11 min-w-[4.5rem] items-center justify-center rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/70 hover:border-white/60"
              >
                Close
              </button>
            </div>

            <nav className="mx-auto max-w-6xl px-4 pb-6">
              <ul className="space-y-2">
                {navLinks.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={`nav-link block min-h-11 rounded-2xl border px-4 py-3 text-[0.7rem] uppercase tracking-[0.28em] ${
                        l.cta
                          ? "border-white/30 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
                          : "border-white/10 text-white/70 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
