import AdminNav from "./AdminNav";

export const metadata = {
  title: "Admin · Bright Line Photography",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f1319]">
      <AdminNav />
      <main className="pt-14 lg:pt-0 lg:pl-64">{children}</main>
    </div>
  );
}
