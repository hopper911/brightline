"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { TenantSlug } from "@/lib/platform/tenants/types";

type Template = {
  id: string;
  label: string;
  description: string;
};

type Props = {
  allowedTenants: TenantSlug[];
  canCreateBrightline: boolean;
  canCreateMirotech: boolean;
  defaultTenant: TenantSlug;
};

export function StudioProjectCreateForm({
  allowedTenants,
  canCreateBrightline,
  canCreateMirotech,
  defaultTenant,
}: Props) {
  const router = useRouter();
  const creatableTenants = allowedTenants.filter((t) =>
    t === "brightline" ? canCreateBrightline : canCreateMirotech
  );

  const [open, setOpen] = useState(false);
  const [tenant, setTenant] = useState<TenantSlug>(
    creatableTenants.includes(defaultTenant) ? defaultTenant : creatableTenants[0] ?? "brightline"
  );
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = tenant === "brightline" ? "work-project" : "mirotech-case-study";

  useEffect(() => {
    if (!open || !creatableTenants.includes(tenant)) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/studio/projects/templates?tenant=${tenant}&kind=${kind}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { templates?: Template[] };
      if (!cancelled) {
        setTemplates(data.templates ?? []);
        setTemplateId("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tenant, kind, creatableTenants]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant,
          kind,
          title: title.trim(),
          templateId: templateId || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        project?: { editHref?: string };
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Create failed.");
        return;
      }
      const href = data.project?.editHref;
      if (href) {
        router.push(href);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!creatableTenants.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-200/15"
      >
        Create project
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1018] p-6 shadow-2xl"
            role="dialog"
            aria-labelledby="studio-create-project-title"
          >
            <h3 id="studio-create-project-title" className="font-display text-xl text-white">
              Create project
            </h3>
            <p className="mt-1 text-sm text-white/55">
              Minimal draft — you&apos;ll continue in the full editor after save.
            </p>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              {creatableTenants.length > 1 ? (
                <label className="block text-sm">
                  <span className="text-white/55">Tenant</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value as TenantSlug)}
                  >
                    {creatableTenants.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block text-sm">
                <span className="text-white/55">Title</span>
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project title"
                  required
                />
              </label>

              {templates.length > 0 ? (
                <label className="block text-sm">
                  <span className="text-white/55">Template (optional)</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    <option value="">No template</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {error ? <p className="text-sm text-red-300">{error}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white"
                  disabled={submitting}
                >
                  {submitting ? "Creating…" : "Create & edit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
