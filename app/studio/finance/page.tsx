import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getFinanceOverview } from "@/lib/studio/finance";
import { FinanceQuickActions } from "./FinanceQuickActions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finance · Studio OS · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

function money(value: { toString(): string }) {
  return Number(value.toString()).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function shortDate(value: Date) {
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function StudioFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login?next=%2Fstudio%2Ffinance");

  const sp = await searchParams;
  const data = await getFinanceOverview(sp.month);

  return (
    <main className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/studio" className="text-xs uppercase tracking-[0.25em] text-white/45 hover:text-white/80">
            Studio OS
          </Link>
          <h1 className="mt-3 font-display text-4xl text-white">Finance</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Manual revenue, expenses, receipts, and outstanding balances for the operator.
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="month"
            name="month"
            defaultValue={data.month.label}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <button type="submit" className="btn btn-ghost">View</button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Revenue This Month</p>
          <p className="mt-2 text-3xl text-white">{money(data.summary.revenueThisMonth)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Expenses This Month</p>
          <p className="mt-2 text-3xl text-white">{money(data.summary.expensesThisMonth)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Estimated Profit</p>
          <p className="mt-2 text-3xl text-white">{money(data.summary.estimatedProfit)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Outstanding Payments</p>
          <p className="mt-2 text-3xl text-white">{money(data.summary.outstandingBalance)}</p>
        </div>
      </section>

      <section className="mt-8">
        <FinanceQuickActions
          projects={data.projects.map((project) => ({
            id: project.id,
            title: project.title,
            client: project.client,
            paymentStatus: project.paymentStatus,
          }))}
        />
      </section>

      <section className="mt-10 grid gap-8 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="border-b border-white/10 bg-white/5 px-4 py-3">
            <h2 className="font-display text-xl text-white">Outstanding Payments</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.outstandingProjects.length === 0 ? (
              <p className="px-4 py-8 text-sm text-white/55">No outstanding project balances.</p>
            ) : (
              data.outstandingProjects.map((project) => (
                <div key={project.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                  <div className="col-span-7">
                    <Link href={`/admin/projects/${project.id}/edit`} className="text-white hover:underline">
                      {project.title}
                    </Link>
                    <p className="text-xs text-white/45">{project.client} · {project.paymentStatus}</p>
                  </div>
                  <div className="col-span-3 text-right text-white/70">{money(project.amountPaid)} paid</div>
                  <div className="col-span-2 text-right font-medium text-white">{money(project.balanceRemaining)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="border-b border-white/10 bg-white/5 px-4 py-3">
            <h2 className="font-display text-xl text-white">Payments List</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.payments.length === 0 ? (
              <p className="px-4 py-8 text-sm text-white/55">No payments in this month.</p>
            ) : (
              data.payments.map((payment) => (
                <div key={payment.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                  <div className="col-span-2 text-white/45">{shortDate(payment.date)}</div>
                  <div className="col-span-6">
                    <p className="text-white">{payment.project.title}</p>
                    <p className="text-xs text-white/45">{payment.type}{payment.note ? ` · ${payment.note}` : ""}</p>
                  </div>
                  <div className="col-span-4 text-right font-medium text-white">{money(payment.amount)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 xl:col-span-2">
          <div className="border-b border-white/10 bg-white/5 px-4 py-3">
            <h2 className="font-display text-xl text-white">Expenses List</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.expenses.length === 0 ? (
              <p className="px-4 py-8 text-sm text-white/55">No expenses in this month.</p>
            ) : (
              data.expenses.map((expense) => (
                <div key={expense.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                  <div className="col-span-2 text-white/45">{shortDate(expense.date)}</div>
                  <div className="col-span-5">
                    <p className="text-white">{expense.category}</p>
                    <p className="text-xs text-white/45">
                      {expense.project?.title ?? "No project"}{expense.note ? ` · ${expense.note}` : ""}
                    </p>
                  </div>
                  <div className="col-span-3 text-white/55">
                    {expense.receiptKey ? "Receipt attached" : "No receipt"}
                  </div>
                  <div className="col-span-2 text-right font-medium text-white">{money(expense.amount)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
