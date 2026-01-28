"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const navLinks = [
  { href: "/#portfolio", label: "Portfolio" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastScroll = useRef(0);

  // Close on ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
      className={`sticky top-0 z-50 border-b border-white/10 transition-transform duration-300 ${
        scrolled ? "bg-[#0b0e12]/80 backdrop-blur-md" : "bg-[#0b0e12]/60"
      } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-display tracking-[0.32em] text-sm uppercase text-white"
          onClick={() => setOpen(false)}
        >
          BRIGHT LINE{" "}
          <span className="opacity-60 font-normal text-[11px] tracking-[0.18em]">
            PHOTOGRAPHY
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.32em] text-white/70">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="md:hidden inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/80 hover:border-white/40"
        >
          Menu
        </button>
      </div>

      {/* Mobile overlay + slide-down panel */}
      {open && (
        <div className="md:hidden">
          {/* overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => setOpen(false)}
          />

          {/* panel */}
          <div
            ref={panelRef}
            className="fixed left-0 right-0 top-0 z-[60] border-b border-white/10 bg-[#0b0e12]/95 backdrop-blur"
          >
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              <Link
                href="/"
                className="font-display tracking-[0.32em] text-sm uppercase text-white"
                onClick={() => setOpen(false)}
              >
                BRIGHT LINE{" "}
                <span className="opacity-60 font-normal text-[11px] tracking-[0.18em]">
                  PHOTOGRAPHY
                </span>
              </Link>

              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/70 hover:border-white/60"
              >
                Close
              </button>
            </div>

            <nav className="mx-auto max-w-6xl px-4 pb-6">
              <ul className="space-y-2">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-2xl border border-white/10 px-4 py-3 text-sm uppercase tracking-[0.28em] text-white/70 hover:border-white/30 hover:text-white"
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
