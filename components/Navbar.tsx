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
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="tracking-[0.25em] font-semibold text-sm uppercase"
          onClick={() => setOpen(false)}
        >
          BRIGHT LINE <span className="opacity-70 font-normal">PHOTOGRAPHY</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm uppercase tracking-widest opacity-90">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:opacity-70">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="md:hidden inline-flex items-center justify-center rounded border border-white/20 px-3 py-2 text-xs uppercase tracking-widest hover:border-white/40"
        >
          Menu
        </button>
      </div>

      {/* Mobile overlay + slide-down panel */}
      {open && (
        <div className="md:hidden">
          {/* overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/70"
            onClick={() => setOpen(false)}
          />

          {/* panel */}
          <div
            ref={panelRef}
            className="fixed left-0 right-0 top-0 z-[60] border-b border-white/10 bg-black/90 backdrop-blur"
          >
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              <Link
                href="/"
                className="tracking-[0.25em] font-semibold text-sm uppercase"
                onClick={() => setOpen(false)}
              >
                BRIGHT LINE <span className="opacity-70 font-normal">PHOTOGRAPHY</span>
              </Link>

              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="rounded border border-white/20 px-3 py-2 text-xs uppercase tracking-widest hover:border-white/40"
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
                      className="block rounded border border-white/10 px-4 py-3 text-sm uppercase tracking-widest hover:border-white/30"
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
