import { getValidAccessToken } from "@/lib/canva/oauth";

const CANVA_API_BASE = "https://api.canva.com/rest";

export type CanvaDesignSize = "cover" | "feed" | "story";

export const CANVA_DESIGN_SIZES: Record<
  CanvaDesignSize,
  { width: number; height: number; label: string }
> = {
  cover: { width: 1200, height: 630, label: "Cover / OG" },
  feed: { width: 1080, height: 1080, label: "Instagram feed" },
  story: { width: 1080, height: 1920, label: "Story / TikTok" },
};

export type CanvaDesignResult = {
  id: string;
  title: string;
  editUrl: string;
  viewUrl: string;
};

async function canvaFetch<T>(
  path: string,
  init?: RequestInit & { accessToken?: string }
): Promise<T> {
  const accessToken = init?.accessToken || (await getValidAccessToken());
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${CANVA_API_BASE}${path}`, {
    method: init?.method,
    body: init?.body,
    headers,
    redirect: init?.redirect,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "message" in json
        ? String((json as { message: unknown }).message)
        : json && typeof json === "object" && "error" in json
          ? String((json as { error: unknown }).error)
          : `Canva request failed (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status >= 400 ? res.status : 502 });
  }
  return json as T;
}

export async function createCanvaDesign(options: {
  size: CanvaDesignSize;
  title: string;
  assetId?: string;
}): Promise<CanvaDesignResult> {
  const dims = CANVA_DESIGN_SIZES[options.size];
  const body: Record<string, unknown> = {
    design_type: {
      type: "custom",
      width: dims.width,
      height: dims.height,
    },
    title: options.title.slice(0, 255) || dims.label,
  };
  if (options.assetId) {
    body.asset_id = options.assetId;
  }

  const data = await canvaFetch<{
    design?: {
      id?: string;
      title?: string;
      urls?: { edit_url?: string; view_url?: string };
    };
  }>("/v1/designs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const design = data.design;
  const id = design?.id?.trim() || "";
  if (!id) {
    throw Object.assign(new Error("Canva did not return a design id."), { status: 502 });
  }
  return {
    id,
    title: design?.title || options.title,
    editUrl: design?.urls?.edit_url || `https://www.canva.com/design/${id}/edit`,
    viewUrl: design?.urls?.view_url || "",
  };
}

/** Upload image bytes to Canva; poll until asset id is ready. */
export async function uploadImageAsset(options: {
  bytes: Buffer;
  name: string;
}): Promise<string> {
  const accessToken = await getValidAccessToken();
  const name = options.name.slice(0, 50) || "brightline-upload";
  const nameBase64 = Buffer.from(name, "utf8").toString("base64");

  const start = await canvaFetch<{
    job?: { id?: string; status?: string; asset?: { id?: string } };
  }>("/v1/asset-uploads", {
    method: "POST",
    accessToken,
    headers: {
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: nameBase64 }),
    },
    body: new Uint8Array(options.bytes),
  });

  const jobId = start.job?.id;
  if (start.job?.status === "success" && start.job.asset?.id) {
    return start.job.asset.id;
  }
  if (!jobId) {
    throw Object.assign(new Error("Canva asset upload did not return a job id."), { status: 502 });
  }

  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await canvaFetch<{
      job?: {
        id?: string;
        status?: string;
        asset?: { id?: string };
        error?: { message?: string };
      };
    }>(`/v1/asset-uploads/${encodeURIComponent(jobId)}`, { accessToken });

    if (status.job?.status === "success" && status.job.asset?.id) {
      return status.job.asset.id;
    }
    if (status.job?.status === "failed") {
      throw Object.assign(
        new Error(status.job.error?.message || "Canva asset upload failed."),
        { status: 502 }
      );
    }
  }
  throw Object.assign(new Error("Timed out waiting for Canva asset upload."), { status: 504 });
}

export async function exportDesignAsJpg(designId: string): Promise<string> {
  const accessToken = await getValidAccessToken();
  const start = await canvaFetch<{
    job?: { id?: string; status?: string; urls?: string[]; error?: { message?: string } };
  }>("/v1/exports", {
    method: "POST",
    accessToken,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      design_id: designId,
      // JPG is Free-tier safe (PNG lossy/lossless flags can fail on Free)
      format: { type: "jpg", quality: 85 },
    }),
  });

  const jobId = start.job?.id;
  if (start.job?.status === "success" && start.job.urls?.[0]) {
    return start.job.urls[0];
  }
  if (!jobId) {
    throw Object.assign(new Error("Canva export did not return a job id."), { status: 502 });
  }

  for (let i = 0; i < 45; i += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    const status = await canvaFetch<{
      job?: { id?: string; status?: string; urls?: string[]; error?: { message?: string } };
    }>(`/v1/exports/${encodeURIComponent(jobId)}`, { accessToken });

    if (status.job?.status === "success" && status.job.urls?.[0]) {
      return status.job.urls[0];
    }
    if (status.job?.status === "failed") {
      throw Object.assign(
        new Error(status.job.error?.message || "Canva export failed."),
        { status: 502 }
      );
    }
  }
  throw Object.assign(new Error("Timed out waiting for Canva export."), { status: 504 });
}
