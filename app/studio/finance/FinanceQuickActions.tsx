"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectOption = {
  id: string;
  title: string;
  client: string;
  paymentStatus: string;
};

type Props = {
  projects: ProjectOption[];
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

async function readJson(res: Response) {
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export function FinanceQuickActions({ projects }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addPayment(form: HTMLFormElement) {
    const fd = new FormData(form);
    const payload = {
      projectId: fd.get("projectId")?.toString(),
      amount: fd.get("amount")?.toString(),
      date: fd.get("date")?.toString(),
      type: fd.get("type")?.toString(),
      note: fd.get("note")?.toString(),
    };
    const res = await fetch("/api/studio/finance/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await readJson(res);
  }

  async function addExpense(form: HTMLFormElement) {
    const fd = new FormData(form);
    const file = fd.get("receipt");
    let receiptKey: string | null = null;
    let receiptFilename: string | null = null;
    let receiptContentType: string | null = null;

    if (file instanceof File && file.size > 0) {
      const signRes = await fetch("/api/studio/receipts/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const signed = (await signRes.json()) as {
        ok?: boolean;
        error?: string;
        uploadUrl?: string;
        uploadHeaders?: Record<string, string>;
        key?: string;
      };
      if (!signRes.ok || !signed.ok || !signed.uploadUrl || !signed.key) {
        throw new Error(signed.error ?? "Receipt upload signing failed.");
      }
      const uploadRes = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream", ...(signed.uploadHeaders ?? {}) },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error("Receipt upload failed.");
      }
      receiptKey = signed.key;
      receiptFilename = file.name;
      receiptContentType = file.type || "application/octet-stream";
    }

    const projectId = fd.get("projectId")?.toString().trim();
    const payload = {
      projectId: projectId || null,
      amount: fd.get("amount")?.toString(),
      category: fd.get("category")?.toString(),
      date: fd.get("date")?.toString(),
      note: fd.get("note")?.toString(),
      receiptKey,
      receiptPath: receiptKey,
      receiptFilename,
      receiptContentType,
    };
    const res = await fetch("/api/studio/finance/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    await readJson(res);
  }

  async function updateProjectFinance(form: HTMLFormElement) {
    const fd = new FormData(form);
    const projectId = fd.get("projectId")?.toString();
    if (!projectId) throw new Error("Choose a project.");
    const res = await fetch(`/api/studio/finance/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        totalPrice: fd.get("totalPrice")?.toString(),
        depositAmount: fd.get("depositAmount")?.toString(),
        paymentStatus: fd.get("paymentStatus")?.toString(),
      }),
    });
    await readJson(res);
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
    action: "payment" | "expense" | "project"
  ) {
    e.preventDefault();
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      if (action === "payment") await addPayment(e.currentTarget);
      if (action === "expense") await addExpense(e.currentTarget);
      if (action === "project") await updateProjectFinance(e.currentTarget);
      e.currentTarget.reset();
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35";
  const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/50";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <form
        onSubmit={(e) => void handleSubmit(e, "payment")}
        className="rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        <h2 className="font-display text-xl text-white">Quick add payment</h2>
        <div className="mt-4 space-y-3">
          <label className={labelClass}>
            Project
            <select name="projectId" required className={`${inputClass} mt-1`}>
              <option value="">Choose project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.client} - {project.title}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Amount
            <input name="amount" type="number" min="0.01" step="0.01" required className={`${inputClass} mt-1`} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Date
              <input name="date" type="date" defaultValue={todayInputValue()} className={`${inputClass} mt-1`} />
            </label>
            <label className={labelClass}>
              Type
              <select name="type" defaultValue="OTHER" className={`${inputClass} mt-1`}>
                <option value="DEPOSIT">Deposit</option>
                <option value="FINAL">Final</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
          </div>
          <input name="note" placeholder="Optional note" className={inputClass} />
          <button type="submit" disabled={busy != null} className="btn btn-primary w-full">
            {busy === "payment" ? "Saving..." : "Save payment"}
          </button>
        </div>
      </form>

      <form
        onSubmit={(e) => void handleSubmit(e, "expense")}
        className="rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        <h2 className="font-display text-xl text-white">Quick add expense</h2>
        <div className="mt-4 space-y-3">
          <label className={labelClass}>
            Project optional
            <select name="projectId" className={`${inputClass} mt-1`}>
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.client} - {project.title}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Amount
              <input name="amount" type="number" min="0.01" step="0.01" required className={`${inputClass} mt-1`} />
            </label>
            <label className={labelClass}>
              Date
              <input name="date" type="date" defaultValue={todayInputValue()} className={`${inputClass} mt-1`} />
            </label>
          </div>
          <input name="category" required placeholder="Category" className={inputClass} />
          <input name="note" placeholder="Optional note" className={inputClass} />
          <input name="receipt" type="file" accept="image/*,.pdf" className="text-sm text-white/70" />
          <button type="submit" disabled={busy != null} className="btn btn-primary w-full">
            {busy === "expense" ? "Saving..." : "Save expense"}
          </button>
        </div>
      </form>

      <form
        onSubmit={(e) => void handleSubmit(e, "project")}
        className="rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        <h2 className="font-display text-xl text-white">Invoice / status</h2>
        <div className="mt-4 space-y-3">
          <label className={labelClass}>
            Project
            <select name="projectId" required className={`${inputClass} mt-1`}>
              <option value="">Choose project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.client} - {project.title}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="totalPrice" type="number" min="0" step="0.01" placeholder="Total price" className={inputClass} />
            <input name="depositAmount" type="number" min="0" step="0.01" placeholder="Deposit" className={inputClass} />
          </div>
          <select name="paymentStatus" defaultValue="" className={inputClass}>
            <option value="">Auto status</option>
            <option value="DEPOSIT_DUE">Deposit due</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="WRITE_OFF">Write off</option>
          </select>
          <button type="submit" disabled={busy != null} className="btn btn-primary w-full">
            {busy === "project" ? "Saving..." : "Update status"}
          </button>
        </div>
      </form>

      {message ? <p className="lg:col-span-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}
      {error ? <p className="lg:col-span-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
    </div>
  );
}
