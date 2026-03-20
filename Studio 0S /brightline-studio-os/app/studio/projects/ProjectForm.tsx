"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/studio/Panel";

type Client = { id: string; name: string };

type ProjectFormProps = {
  project?: {
    id: string;
    name: string;
    status: string;
    shootDate: string | null;
    clientId: string | null;
    notes: string | null;
  };
  clientId?: string | null;
};

export function ProjectForm({ project, clientId: initialClientId }: ProjectFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdFromQuery = searchParams.get("clientId") ?? initialClientId ?? undefined;

  const [clients, setClients] = useState<Client[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const rawClientId = (fd.get("clientId") as string) || "";
    const body = {
      name: fd.get("name") as string,
      clientId: project ? (rawClientId || null) : (rawClientId || clientIdFromQuery || undefined),
      status: (fd.get("status") as string) || "draft",
      shootDate: (fd.get("shootDate") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    };

    try {
      if (project) {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, clientId: rawClientId || null }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? err.error ?? "Update failed");
        }
        router.push(`/studio/projects/${project.id}`);
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? err.error ?? "Create failed");
        }
        const created = await res.json();
        router.push(`/studio/projects/${created.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  const defaultClientId = project?.clientId ?? clientIdFromQuery ?? "";

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
            defaultValue={project?.name}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="clientId" className="block text-sm font-medium text-white/70">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={defaultClientId}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          >
            <option value="">— None —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-white/70">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={project?.status ?? "draft"}
            className="mt-1 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/95 focus:border-accent-border focus:outline-none"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label htmlFor="shootDate" className="block text-sm font-medium text-white/70">
            Shoot date
          </label>
          <input
            id="shootDate"
            name="shootDate"
            type="date"
            defaultValue={
              project?.shootDate
                ? new Date(project.shootDate).toISOString().slice(0, 10)
                : ""
            }
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
            defaultValue={project?.notes ?? ""}
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
          {pending ? "Saving…" : project ? "Save" : "Create project"}
        </button>
        <Link
          href={project ? `/studio/projects/${project.id}` : "/studio/projects"}
          className="rounded-studio-base border border-white/[0.08] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.05]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
