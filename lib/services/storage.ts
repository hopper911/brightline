import { signDownloadUrl, signUploadUrl } from "@/lib/storage";

type StoragePayload = {
  action: "upload" | "download";
  key: string;
  contentType?: string;
  expiresIn?: number;
};

export function normalizeStoragePayload(input: Partial<StoragePayload>) {
  return {
    action: input.action || "upload",
    key: input.key || "",
    contentType: input.contentType,
    expiresIn: input.expiresIn,
  } as StoragePayload;
}

export async function handleStorage(payload: StoragePayload) {
  if (!payload.key) {
    return { ok: false, error: "Missing key." } as const;
  }

  if (payload.action === "download") {
    const signed = await signDownloadUrl({
      key: payload.key,
      expiresIn: payload.expiresIn,
    });
    return { ok: true, data: signed } as const;
  }

  const signed = await signUploadUrl({
    key: payload.key,
    contentType: payload.contentType,
    expiresIn: payload.expiresIn,
  });
  return { ok: true, data: signed } as const;
}
import { signDownloadUrl, signUploadUrl } from "@/lib/storage";

type StoragePayload = {
  action: "upload" | "download";
  key: string;
  contentType?: string;
  expiresIn?: number;
};

export function normalizeStoragePayload(input: Partial<StoragePayload>) {
  return {
    action: input.action || "upload",
    key: input.key || "",
    contentType: input.contentType,
    expiresIn: input.expiresIn,
  } as StoragePayload;
}

export async function handleStorage(payload: StoragePayload) {
  if (!payload.key) {
    return { ok: false, error: "Missing key." } as const;
  }

  if (payload.action === "download") {
    const signed = await signDownloadUrl({
      key: payload.key,
      expiresIn: payload.expiresIn,
    });
    return { ok: true, data: signed } as const;
  }

  const signed = await signUploadUrl({
    key: payload.key,
    contentType: payload.contentType,
    expiresIn: payload.expiresIn,
  });
  return { ok: true, data: signed } as const;
}
