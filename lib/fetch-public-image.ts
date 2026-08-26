import { assertPublicHttpUrlResolved } from "@/lib/ssrf-guard";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;

/**
 * Fetch an image URL for server-side AI/vision with SSRF checks on every hop.
 * Does not follow redirects automatically — each Location is re-validated.
 */
export async function fetchPublicImageAsDataUrl(
  imageUrl: string,
  origin: string,
  options?: { maxBytes?: number }
): Promise<string> {
  const maxBytes = options?.maxBytes ?? MAX_IMAGE_BYTES;
  let current = (await assertPublicHttpUrlResolved(imageUrl, origin)).toString();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "image/*,*/*;q=0.8" },
    });

    if (
      res.status === 301 ||
      res.status === 302 ||
      res.status === 303 ||
      res.status === 307 ||
      res.status === 308
    ) {
      const loc = res.headers.get("location");
      if (!loc) {
        throw Object.assign(new Error("Image redirect missing Location."), { status: 400 });
      }
      current = (await assertPublicHttpUrlResolved(new URL(loc, current).toString(), origin)).toString();
      continue;
    }

    if (!res.ok) {
      throw Object.assign(new Error(`Could not load image (${res.status}).`), { status: 400 });
    }

    const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0]!.trim();
    if (!contentType.startsWith("image/") || contentType === "image/svg+xml") {
      throw Object.assign(new Error("URL must point to a raster image."), { status: 400 });
    }

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      throw Object.assign(new Error("Image is too large."), { status: 400 });
    }
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  }

  throw Object.assign(new Error("Too many redirects while loading image."), { status: 400 });
}
