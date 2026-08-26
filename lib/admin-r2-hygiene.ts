export const HEAVY_IMAGE_BYTES = 1.5 * 1024 * 1024;
export const HEAVY_VIDEO_BYTES = 15 * 1024 * 1024;
export const HEAVY_ANY_BYTES = 8 * 1024 * 1024;

function fileNameFromKey(key: string): string {
  const clean = key.trim().replace(/^\/+/, "");
  const parts = clean.split("/");
  return parts[parts.length - 1] || clean;
}

function detectKind(key: string): "image" | "video" | "other" {
  const lower = key.toLowerCase();
  if (/\.(jpe?g|png|webp|gif|avif|heic|tiff?)$/i.test(lower)) return "image";
  if (/\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(lower)) return "video";
  return "other";
}

function pairKeyCandidate(key: string): string | null {
  if (key.includes("web_full")) return key.replace(/web_full/g, "web_thumb");
  if (key.includes("web_thumb")) return key.replace(/web_thumb/g, "web_full");
  if (key.includes("/full/")) return key.replace(/\/full\//g, "/thumb/");
  if (key.includes("/thumb/")) return key.replace(/\/thumb\//g, "/full/");
  return null;
}

export function duplicateStem(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/-thumb$/i, "")
    .replace(/^\d{2,}_/, "")
    .trim()
    .toLowerCase();
}

export function isHeavyObject(key: string, size: number): boolean {
  if (!Number.isFinite(size) || size <= 0) return false;
  const kind = detectKind(key);
  if (kind === "image") return size > HEAVY_IMAGE_BYTES;
  if (kind === "video") return size > HEAVY_VIDEO_BYTES;
  return size > HEAVY_ANY_BYTES;
}

export type HygieneObject = {
  key: string;
  size: number;
};

export type DuplicateGroup = {
  stem: string;
  keys: string[];
  sizes: number[];
};

/** Groups of 2+ objects that share a filename stem, excluding a lone full+thumb pair. */
export function groupDuplicateKeys(objects: HygieneObject[]): DuplicateGroup[] {
  const byStem = new Map<string, HygieneObject[]>();
  for (const o of objects) {
    const stem = duplicateStem(fileNameFromKey(o.key));
    if (!stem) continue;
    const list = byStem.get(stem) ?? [];
    list.push(o);
    byStem.set(stem, list);
  }

  const groups: DuplicateGroup[] = [];
  for (const [stem, list] of byStem) {
    if (list.length < 2) continue;
    if (list.length === 2) {
      const a = list[0]!.key;
      const b = list[1]!.key;
      if (pairKeyCandidate(a) === b || pairKeyCandidate(b) === a) continue;
    }
    groups.push({
      stem,
      keys: list.map((o) => o.key),
      sizes: list.map((o) => o.size),
    });
  }
  return groups.sort((a, b) => b.keys.length - a.keys.length);
}

export function looksLikeR2Key(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const clean = value.trim().replace(/^\/+/, "");
  if (!clean || clean.includes("..") || clean.includes("\0")) return false;
  if (/^(https?:|data:|blob:)/i.test(clean)) return false;
  return clean.includes("/") && !/\s/.test(clean);
}

/** Walk JSON / strings and collect values that look like R2 object keys. */
export function collectKeysFromUnknown(value: unknown, out: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return;
  if (looksLikeR2Key(value)) {
    out.add(value.trim().replace(/^\/+/, ""));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectKeysFromUnknown(item, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/key|storage|image|poster|cover|thumb|full|r2/i.test(k) && looksLikeR2Key(v)) {
        out.add(String(v).trim().replace(/^\/+/, ""));
      } else {
        collectKeysFromUnknown(v, out, depth + 1);
      }
    }
  }
}
