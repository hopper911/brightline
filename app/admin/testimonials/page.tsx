"use client";

import { useEffect, useState } from "react";

type Project = { id: string; title: string };

type Testimonial = {
  id: string;
  name: string;
  role?: string | null;
  company?: string | null;
  quote: string;
  published: boolean;
  project?: Project | null;
};

export default function AdminTestimonialsPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [quote, setQuote] = useState("");
  const [projectId, setProjectId] = useState<string | "">("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Testimonial[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  useEffect(() => {
    let active = true;
    async function load() {
      const [projectsRes, testimonialsRes] = await Promise.all([
        fetch("/api/admin/projects"),
        fetch("/api/admin/testimonials"),
      ]);

      if (!active) return;

      if (projectsRes.ok) {
        const data = (await projectsRes.json()) as { projects: Project[] };
        setProjects(data.projects || []);
      }

      if (testimonialsRes.ok) {
        const data = (await testimonialsRes.json()) as { testimonials: Testimonial[] };
        setItems(data.testimonials || []);
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
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role: role || undefined,
          company: company || undefined,
          quote,
          projectId: projectId || null,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as { testimonial: Testimonial };
      setItems((prev) => [data.testimonial, ...prev]);
      setName("");
      setRole("");
      setCompany("");
      setQuote("");
      setProjectId("");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function togglePublished(item: Testimonial) {
    const res = await fetch(`/api/admin/testimonials/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !item.published }),
    });

    if (!res.ok) return;
    const data = (await res.json()) as { testimonial: Testimonial };
    setItems((prev) =>
      prev.map((t) => (t.id === data.testimonial.id ? data.testimonial : t))
    );
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="section-title">Admin · Testimonials</h1>
      <p className="section-subtitle">Add client quotes and proof points.</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6"
      >
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Client name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <textarea
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={4}
          required
        />
        <select
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Link to project (optional)</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">
          {status === "saving" ? "Saving..." : "Create testimonial"}
        </button>
        {status === "error" ? (
          <p className="text-sm text-red-600">Could not save testimonial.</p>
        ) : null}
      </form>

      <div className="mt-10 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-black/80">{item.quote}</p>
                <p className="text-xs text-black/50">
                  {item.name}
                  {item.role ? ` · ${item.role}` : ""}
                  {item.company ? ` · ${item.company}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="btn btn-ghost"
                  onClick={() => togglePublished(item)}
                >
                  {item.published ? "Hide" : "Show"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => deleteItem(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
