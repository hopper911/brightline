import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Bright Line Photography",
  description:
    "Request availability for commercial photography in hospitality, real estate, and fashion.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
