import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Bright Line Photography",
  description:
    "Request availability for commercial photography in hospitality, real estate, and fashion.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact | Bright Line Photography",
    description:
      "Request availability for commercial photography in hospitality, real estate, and fashion.",
    url: "/contact",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Bright Line Photography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact | Bright Line Photography",
    description:
      "Request availability for commercial photography in hospitality, real estate, and fashion.",
    images: ["/og-image.svg"],
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
