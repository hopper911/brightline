"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LogRow = {
  id: string;
  action: string | null;
  imageId: string | null;
  ip: string | null;
  createdAt: string;
  galleryTitle: string | null;
  galleryId: string | null;
  codeHint: string | null;
};

type DownloadRow = {
  id: string;
  type: string | null;
  imageId: string | null;
  galleryTitle: string | null;
  galleryId: string | null;
  codeHint: string | null;
};

export function GalleryActivityClient() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/admin/gallery-activity?limit=100", {
          credentials: "include",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          logs?: LogRow[];
          downloads?: DownloadRow[];
          error?: string;
        };
        if (!active) return;
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Load failed");
        setLogs(data.logs ?? []);
        setDownloads(data.downloads ?? []);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="mt-10 text-sm text-white/50">Loading…</p>;
  }

  if (error) {
    return (
      <p className="mt-10 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </p>
    );
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xs uppercase tracking-[0.25em] text-white/50">Views & actions</h2>
        <ul className="mt-4 max-h-[480px] space-y-2 overflow-y-auto text-sm">
          {logs.length === 0 ? (
            <li className="text-white/50">No log entries yet.</li>
          ) : (
            logs.map((l) => (
              <li
                key={l.id}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/80"
              >
                <p className="font-mono text-xs text-white/50">
                  {new Date(l.createdAt).toLocaleString()}
                </p>
                <p className="mt-1">
                  <span className="text-emerald-200/90">{l.action || "—"}</span>
                  {l.galleryTitle ? (
                    <>
                      {" "}
                      ·{" "}
                      {l.galleryId ? (
                        <Link
                          href={`/admin/galleries/${l.galleryId}`}
                          className="underline decoration-white/30 hover:decoration-white"
                        >
                          {l.galleryTitle}
                        </Link>
                      ) : (
                        l.galleryTitle
                      )}
                    </>
                  ) : null}
                </p>
                {l.codeHint ? (
                  <p className="text-xs text-white/45">Token {l.codeHint}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xs uppercase tracking-[0.25em] text-white/50">Downloads</h2>
        <ul className="mt-4 max-h-[480px] space-y-2 overflow-y-auto text-sm">
          {downloads.length === 0 ? (
            <li className="text-white/50">No downloads logged yet.</li>
          ) : (
            downloads.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/80"
              >
                <p className="text-amber-200/90">{d.type || "download"}</p>
                {d.galleryTitle ? (
                  <p className="mt-1">
                    {d.galleryId ? (
                      <Link
                        href={`/admin/galleries/${d.galleryId}`}
                        className="underline decoration-white/30 hover:decoration-white"
                      >
                        {d.galleryTitle}
                      </Link>
                    ) : (
                      d.galleryTitle
                    )}
                  </p>
                ) : null}
                {d.codeHint ? (
                  <p className="text-xs text-white/45">Token {d.codeHint}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
