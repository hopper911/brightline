export const metadata = {
  title: "Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

/**
 * Shared admin chrome (background only). Nav lives in `(dashboard)/layout` so
 * `/admin/login` stays free of sidebar links and Next.js prefetch to protected pages.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#0f1319]">{children}</div>;
}
