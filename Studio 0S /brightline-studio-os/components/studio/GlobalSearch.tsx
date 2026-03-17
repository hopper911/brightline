"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { globalSearch, type GlobalSearchResult } from "@/app/studio/actions";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await globalSearch(q);
      setResults(r);
      setOpen(true);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => runSearch(query), 200);
    } else {
      setResults([]);
      setOpen(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      setResults([]);
    }
  };

  const handleSelect = (r: GlobalSearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    if (r.href) router.push(r.href);
  };

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search projects, drafts, events…"
        aria-label="Global search"
        className="w-full min-w-[200px] max-w-md rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95 placeholder:text-white/40 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent/30"
      />
      {open && (results.length > 0 || searching) && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-72 w-full min-w-[280px] overflow-auto rounded-studio-xl border border-white/[0.08] bg-studio-surface shadow-studio-elevated">
          {searching ? (
            <div className="p-4 text-center text-sm text-white/50">Searching…</div>
          ) : (
            <ul className="py-2">
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(r)}
                    className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <span className="text-sm font-medium text-white/90">{r.title}</span>
                    {(r.snippet || r.meta) && (
                      <span className="text-[11px] text-white/50">
                        {r.snippet}
                        {r.snippet && r.meta ? " · " : ""}
                        {r.meta}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-white/35">{r.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
