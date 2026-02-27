"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/config/brand";

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-[28px] border border-white/10 bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          aria-label="Close booking modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {BRAND.booking.enabled ? (
          <iframe
            src={BRAND.booking.calendlyUrl}
            width="100%"
            height="700"
            frameBorder="0"
            className="rounded-[28px]"
            title="Book a consultation"
          />
        ) : (
          <div className="p-8 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              Booking
            </p>
            <h2 className="font-display text-2xl text-white mt-4">
              Schedule a consultation
            </h2>
            <p className="mt-4 text-sm text-white/70 max-w-md mx-auto">
              Calendly integration not configured. Add your Calendly URL to{" "}
              <code className="text-white/90">NEXT_PUBLIC_CALENDLY_URL</code> in
              your environment variables.
            </p>
            <a
              href="/contact?type=availability"
              className="btn btn-light mt-6 inline-block"
            >
              Check availability instead
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
