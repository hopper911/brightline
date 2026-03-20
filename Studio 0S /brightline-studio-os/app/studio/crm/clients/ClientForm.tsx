"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/studio/Panel";

type ClientFormProps = {
  client?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    notes?: string | null;
  };
};

export function ClientForm({ client }: ClientFormProps) {
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
      notes: (fd.get("notes") as string) || undefined,
    };

    try {
      if (client) {
        const res = await fetch(`/api/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? err.error ?? "Update failed");
        }
        router.push(`/studio/crm/clients/${client.id}`);
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? err.error ?? "Create failed");
        }
        const created = await res.json();
        router.push(`/studio/crm/clients/${created.id}`);
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
            defaultValue={client?.name}
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
            defaultValue={client?.email}
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
            defaultValue={client?.phone ?? ""}
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
            defaultValue={client?.company ?? ""}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-white/70">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={client?.notes ?? ""}
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
          {pending ? "Saving…" : client ? "Save" : "Create client"}
        </button>
        <Link
          href={client ? `/studio/crm/clients/${client.id}` : "/studio/crm/clients"}
          className="rounded-studio-base border border-white/[0.08] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.05]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
