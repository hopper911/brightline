"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ClientRow = {
  id: string;
  companyName: string;
  primaryContactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  followUpStatus: string;
  followUpAt: string | null;
  totalSpend: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  totalPrice: string;
  amountPaid: string;
  balanceRemaining: string;
  paymentStatus: string;
  updatedAt: string;
};

type LeadRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  convertedProjectId: string | null;
};

export default function StudioClientDetail({
  initialClient,
  initialProjects,
  initialLeads,
}: {
  initialClient: ClientRow;
  initialProjects: ProjectRow[];
  initialLeads: LeadRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState(initialClient);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      companyName: fd.get("companyName")?.toString().trim(),
      primaryContactName: fd.get("primaryContactName")?.toString().trim() || null,
      email: fd.get("email")?.toString().trim() || null,
      phone: fd.get("phone")?.toString().trim() || null,
      website: fd.get("website")?.toString().trim() || null,
      industry: fd.get("industry")?.toString().trim() || null,
      addressLine1: fd.get("addressLine1")?.toString().trim() || null,
      addressLine2: fd.get("addressLine2")?.toString().trim() || null,
      city: fd.get("city")?.toString().trim() || null,
      state: fd.get("state")?.toString().trim() || null,
      postalCode: fd.get("postalCode")?.toString().trim() || null,
      country: fd.get("country")?.toString().trim() || null,
      notes: fd.get("notes")?.toString().trim() || null,
      followUpStatus: fd.get("followUpStatus")?.toString() || "NONE",
      followUpAt: fd.get("followUpAt")?.toString().trim() || null,
      isActive: fd.get("isActive") === "on",
    };

    try {
      const res = await fetch(`/api/admin/studio-clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        client?: ClientRow;
      };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      if (data.client) {
        setClient({
          ...client,
          ...data.client,
          totalSpend: data.client.totalSpend ?? client.totalSpend,
          createdAt: data.client.createdAt ?? client.createdAt,
          updatedAt: data.client.updatedAt ?? client.updatedAt,
        });
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this client? Fails if projects are linked.")) return;
    setError(null);
    const res = await fetch(`/api/admin/studio-clients/${client.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Delete failed.");
      return;
    }
    router.push("/admin/clients");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Link
        href="/admin/clients"
        className="text-xs uppercase tracking-[0.25em] text-white/50 hover:text-white/80"
      >
        ← Clients
      </Link>
      <p className="mt-6 text-xs uppercase tracking-[0.35em] text-white/50">
        Studio OS
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl text-white">{client.companyName}</h1>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs uppercase tracking-[0.2em] text-red-400 hover:text-red-300"
        >
          Delete
        </button>
      </div>
      <p className="mt-1 text-xs text-white/40">
        Updated {new Date(client.updatedAt).toLocaleString()}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Total spend</p>
          <p className="mt-1 text-2xl text-white">
            {Number(client.totalSpend).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Past projects</p>
          <p className="mt-1 text-2xl text-white">{initialProjects.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Follow-up</p>
          <p className="mt-1 text-sm text-white">
            {client.followUpStatus}
            {client.followUpAt ? ` · ${new Date(client.followUpAt).toLocaleDateString()}` : ""}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Company name *
          </span>
          <input
            name="companyName"
            required
            defaultValue={client.companyName}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Primary contact
          </span>
          <input
            name="primaryContactName"
            defaultValue={client.primaryContactName ?? ""}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Email
            </span>
            <input
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Phone
            </span>
            <input
              name="phone"
              defaultValue={client.phone ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Website
          </span>
          <input
            name="website"
            defaultValue={client.website ?? ""}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Industry
          </span>
          <input
            name="industry"
            defaultValue={client.industry ?? ""}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Address line 1
          </span>
          <input
            name="addressLine1"
            defaultValue={client.addressLine1 ?? ""}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Address line 2
          </span>
          <input
            name="addressLine2"
            defaultValue={client.addressLine2 ?? ""}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              City
            </span>
            <input
              name="city"
              defaultValue={client.city ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              State
            </span>
            <input
              name="state"
              defaultValue={client.state ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Postal code
            </span>
            <input
              name="postalCode"
              defaultValue={client.postalCode ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Country
            </span>
            <input
              name="country"
              defaultValue={client.country ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">
            Notes
          </span>
          <textarea
            name="notes"
            rows={4}
            defaultValue={client.notes ?? ""}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Follow-up status
            </span>
            <select
              name="followUpStatus"
              defaultValue={client.followUpStatus}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            >
              <option value="NONE">None</option>
              <option value="NEEDED">Needed</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="DONE">Done</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Follow-up date
            </span>
            <input
              name="followUpAt"
              type="date"
              defaultValue={client.followUpAt ? client.followUpAt.slice(0, 10) : ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={client.isActive}
            className="rounded border-white/20"
          />
          Active
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">
          Linked projects
        </h2>
        {initialProjects.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">No Studio projects linked.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {initialProjects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
                >
                  <span>
                    <span className="block text-white/90">{p.title}</span>
                    <span className="text-xs text-white/40">
                      {p.status} · {p.paymentStatus}
                    </span>
                  </span>
                  <span className="text-right text-xs text-white/50">
                    <span className="block">
                      {Number(p.amountPaid).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })} paid
                    </span>
                    <span>
                      {Number(p.balanceRemaining).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })} due
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">
          Converted leads
        </h2>
        {initialLeads.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">
            No Studio leads linked to this client yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {initialLeads.map((l) => (
              <li
                key={l.id}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-white/90">{l.name}</span>
                  <span className="text-xs text-white/40">{l.status}</span>
                </div>
                <p className="text-xs text-white/50">{l.email}</p>
                {l.convertedProjectId ? (
                  <Link
                    href={`/admin/projects/${l.convertedProjectId}`}
                    className="mt-2 inline-block text-xs text-white/60 underline"
                  >
                    View converted project
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
