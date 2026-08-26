"use client";

import { useState } from "react";
import {
  BLOG_SECTION_LABELS,
  defaultSectionOrder,
  type BlogPostFormat,
  type BlogSectionId,
} from "@/lib/blog-post-model";

type BlogSectionOrderEditorProps = {
  format: BlogPostFormat;
  sectionOrder: BlogSectionId[];
  onChange: (order: BlogSectionId[]) => void;
};

export default function BlogSectionOrderEditor({
  format,
  sectionOrder,
  onChange,
}: BlogSectionOrderEditorProps) {
  const [draggedId, setDraggedId] = useState<BlogSectionId | null>(null);
  const [dragOverId, setDraggedOverId] = useState<BlogSectionId | null>(null);

  const order =
    sectionOrder?.length > 0 ? sectionOrder : defaultSectionOrder(format);

  function onDrop(targetId: BlogSectionId) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDraggedOverId(null);
      return;
    }
    const next = [...order];
    const from = next.indexOf(draggedId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    onChange(next);
    setDraggedId(null);
    setDraggedOverId(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/45">
        Drag to rearrange how sections appear on the public post. Empty sections are skipped
        automatically.
      </p>
      <div className="space-y-2">
        {order.map((id) => (
          <div
            key={id}
            draggable
            onDragStart={() => setDraggedId(id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggedId && draggedId !== id) setDraggedOverId(id);
            }}
            onDragLeave={() => setDraggedOverId(null)}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(id);
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setDraggedOverId(null);
            }}
            className={`flex cursor-grab items-center gap-3 rounded-xl border px-4 py-3 text-sm text-white/80 active:cursor-grabbing ${
              dragOverId === id ? "border-violet-300/50 bg-violet-400/10" : "border-white/10 bg-black/30"
            } ${draggedId === id ? "opacity-60" : ""}`}
          >
            <span className="text-white/40">⇅</span>
            <span>{BLOG_SECTION_LABELS[id]}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="text-xs uppercase tracking-[0.16em] text-white/50 underline"
        onClick={() => onChange(defaultSectionOrder(format))}
      >
        Reset to default order
      </button>
    </div>
  );
}
