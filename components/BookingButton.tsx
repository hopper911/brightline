"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BRAND } from "@/lib/config/brand";
import { trackBookingClick } from "@/lib/analytics";

const BookingModal = dynamic(() => import("./BookingModal"), {
  ssr: false,
});

type BookingButtonProps = {
  className?: string;
  children?: React.ReactNode;
  fallbackHref?: string;
  location?: string;
};

/**
 * Booking button that opens Calendly modal if configured,
 * otherwise falls back to contact page.
 */
export default function BookingButton({
  className = "btn btn-light",
  children = "Book a consultation",
  fallbackHref = "/contact?type=availability",
  location = "unknown",
}: BookingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    trackBookingClick(location);
  };

  // If Calendly is not configured, render as link
  if (!BRAND.booking.enabled) {
    return (
      <Link href={fallbackHref} className={className} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button onClick={() => { handleClick(); setIsOpen(true); }} className={className}>
        {children}
      </button>
      <BookingModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
