"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  jobId: string;
  tenant: string;
  disabled?: boolean;
};

export function StudioPublishingRetryButton({ jobId, tenant, disabled }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onRetry() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/studio/publishing/jobs/${encodeURIComponent(jobId)}/retry`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (res.ok && data.ok) {
        setMessage("Retry completed.");
        router.refresh();
      } else {
        setMessage(data.error || "Retry failed.");
      }
    } catch {
      setMessage("Retry request failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={onRetry}
        className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
      >
        {pending ? "Retrying…" : "Retry job"}
      </button>
      {message ? <p className="mt-2 text-sm text-white/60">{message}</p> : null}
    </div>
  );
}
