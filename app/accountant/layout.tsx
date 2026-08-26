import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accountant Portal · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default function AccountantRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <div className={`font-sans`}>{children}</div>
    </div>
  );
}
