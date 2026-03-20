import { PageShell } from "@/components/studio/PageShell";

export const metadata = {
  title: "Finance | Bright Line Studio OS",
  description: "Invoicing, expenses, and payments.",
};

export default function FinancePage() {
  return (
    <PageShell
      title="Finance"
      subtitle="Invoicing, expenses, and payments. Coming soon."
    >
      <div className="rounded-studio-xl border border-white/[0.05] bg-white/[0.02] p-8">
        <p className="text-sm text-white/55">
          Finance module placeholder. Invoices, expenses, and payments will be available here.
        </p>
      </div>
    </PageShell>
  );
}
