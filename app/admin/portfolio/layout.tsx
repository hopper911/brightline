import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Uploads · Bright Line Photography",
  robots: { index: false, follow: false },
};

export default function AdminPortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
