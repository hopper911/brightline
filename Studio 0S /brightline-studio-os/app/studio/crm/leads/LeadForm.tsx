"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/studio/Panel";

type LeadFormProps = {
  lead?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    source?: string | null;
    status: string;
    notes?: string | null;
  };
};

export function LeadForm({ lead }: LeadFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const body = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      phone: (fd.get("phone") as string) || undefined,
      company: (fd.get("company") as string) || undefined,
      source: (fd.get("source") as string) || undefined,
      status: (fd.get("status") as string) || "new",
      notes: (fd.get("notes") as string) || undefined,
    };

    try {
      if (lead) {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? err.error ?? "Update failed");
        }
        router.push(`/studio/crm/leads/${lead.id}`);
      } else {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, status: undefined }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? err.error ?? "Create failed");
        }
        const created = await res.json();
        router.push(`/studio/crm/leads/${created.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Panel padding="base" className="border-rose-500/20 bg-rose-500/5">
          <p className="text-sm text-rose-300/90" role="alert">{error}</p>
        </Panel>
      )}
      <Panel padding="base" className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white/70">
            Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={lead?.name}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white/70">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={lead?.email}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-white/70">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={lead?.phone ?? ""}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-white/70">
            Company
          </label>
          <input
            id="company"
            name="company"
            type="text"
            defaultValue={lead?.company ?? ""}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-white/70">
            Source
          </label>
          <input
            id="source"
            name="source"
            type="text"
            placeholder="e.g. inquiry, referral, website"
            defaultValue={lead?.source ?? ""}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          />
        </div>
        {lead && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-white/70">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={lead.status}
              className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-white/70">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={lead?.notes ?? ""}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          />
        </div>
      </Panel>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/15 disabled:opacity-50"
        >
          {pending ? "Saving…" : lead ? "Save" : "Create lead"}
        </button>
        <Link
          href={lead ? `/studio/crm/leads/${lead.id}` : "/studio/crm/leads"}
          className="rounded-studio-base border border-white/[0.08] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.05]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
