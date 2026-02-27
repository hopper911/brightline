"use client";

import { useEffect, useState } from "react";

type ClientAccess = {
  id: string;
  codeHint?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
  gallery?: { id: string; title: string; slug: string } | null;
};

export default function AdminClientsPage() {
  const [token, setToken] = useState("");
  const [galleryId, setGalleryId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [galleries, setGalleries] = useState<
    { id: string; title: string; slug: string }[]
  >([]);
  const [items, setItems] = useState<ClientAccess[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/admin/clients");
      if (!res.ok || !active) return;
      const data = (await res.json()) as { items: ClientAccess[] };
      setItems(data.items || []);
      const galleriesRes = await fetch("/api/admin/galleries");
      if (galleriesRes.ok) {
        const galleriesData = (await galleriesRes.json()) as {
          galleries: { id: string; title: string; slug: string }[];
        };
        setGalleries(galleriesData.galleries || []);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          galleryId,
          expiresAt: expiresAt || undefined,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as { item: ClientAccess };
      setItems((prev) => [data.item, ...prev]);
      setToken("");
      setGalleryId("");
      setExpiresAt("");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  async function revokeAccess(id: string) {
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="section-title">Admin · Client Access</h1>
      <p className="section-subtitle">
        Create access codes for private client galleries.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6"
      >
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Access code"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        <select
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          value={galleryId}
          onChange={(e) => setGalleryId(e.target.value)}
          required
        >
          <option value="">Select gallery</option>
          {galleries.map((gallery) => (
            <option key={gallery.id} value={gallery.id}>
              {gallery.title}
            </option>
          ))}
        </select>
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Expires at (optional)"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          {status === "saving" ? "Saving..." : "Create access"}
        </button>
      </form>

      <div className="mt-10 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-black/50">
              {item.gallery?.title || "Gallery access"}
            </p>
            <p className="text-sm text-black/70">
              Code ending: {item.codeHint || "—"}
            </p>
            {item.expiresAt ? (
              <p className="text-xs text-black/50">
                Expires: {new Date(item.expiresAt).toLocaleDateString()}
              </p>
            ) : null}
            {item.isActive === false ? (
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-red-500">
                Disabled
              </p>
            ) : null}
            <button
              className="mt-2 text-xs uppercase tracking-[0.2em] text-red-500"
              onClick={() => revokeAccess(item.id)}
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
