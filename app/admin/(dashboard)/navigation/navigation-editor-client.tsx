"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminNavGroup, AdminNavItem } from "@/lib/admin-nav";

export default function NavigationEditorClient({
  initialGroups,
}: {
  initialGroups: AdminNavGroup[];
}) {
  const [groups, setGroups] = useState<AdminNavGroup[]>(() =>
    structuredClone(initialGroups)
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  function updateItem(
    groupId: string,
    itemId: string,
    patch: Partial<AdminNavItem>
  ) {
    setGroups((current) =>
      current.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              items: g.items.map((i) =>
                i.id !== itemId ? i : { ...i, ...patch }
              ),
            }
      )
    );
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/admin/admin-navigation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ groups }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        groups?: AdminNavGroup[];
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed.");
      if (json.groups) setGroups(structuredClone(json.groups));
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Save failed.");
    }
  }

  return (
    <div className="mt-10 space-y-8">
      {message ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-950">
          {message}
        </p>
      ) : null}
      {status === "saved" ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950">
          Sidebar saved. Refresh another admin tab if the menu does not update.
        </p>
      ) : null}

      {groups.map((g) => (
        <section
          key={g.id}
          className="rounded-2xl border border-black/10 bg-white/70 p-6"
        >
          <h2 className="text-xs font-medium uppercase tracking-[0.28em] text-black/45">
            {g.label}
          </h2>
          <div className="mt-4 space-y-4">
            {g.items.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-xl border border-black/10 bg-white/90 p-4 sm:grid-cols-[1fr_1fr_auto]"
              >
                <label className="block text-xs uppercase tracking-[0.2em] text-black/45">
                  Label
                  <input
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-black"
                    value={item.label}
                    onChange={(e) =>
                      updateItem(g.id, item.id, { label: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs uppercase tracking-[0.2em] text-black/45">
                  Path / URL
                  <input
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 font-mono text-xs text-black"
                    value={item.href}
                    onChange={(e) =>
                      updateItem(g.id, item.id, { href: e.target.value })
                    }
                    spellCheck={false}
                  />
                </label>
                <label className="flex cursor-pointer items-end gap-3 pb-1 text-sm text-black/70">
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={(e) =>
                      updateItem(g.id, item.id, { visible: e.target.checked })
                    }
                  />
                  Show
                </label>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary"
          disabled={status === "saving"}
          onClick={() => void save()}
        >
          {status === "saving" ? "Saving…" : "Save sidebar"}
        </button>
        <Link href="/admin" className="btn btn-ghost text-sm">
          Admin home
        </Link>
      </div>
    </div>
  );
}
