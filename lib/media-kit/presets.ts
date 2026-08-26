import { prisma } from "@/lib/prisma";

export type MediaKitCropMode = "attention" | "centre" | "top";

export type MediaKitPreset = {
  id: string;
  label: string;
  motionPrompt: string;
  negativePrompt: string;
  cropMode: MediaKitCropMode;
  captionVoice: string;
  /** Work pillar slugs that default to this preset */
  pillarSlugs: string[];
};

const PRESETS_KEY = "media_kit_presets:v1";

export const DEFAULT_MEDIA_KIT_PRESETS: MediaKitPreset[] = [
  {
    id: "architecture",
    label: "Architecture",
    motionPrompt:
      "Subtle cinematic camera drift through architectural space, soft natural light shifts, calm premium real-estate motion, elegant and restrained.",
    negativePrompt: "blurry, distorted, watermark, text overlay, low quality, people walking",
    cropMode: "attention",
    captionVoice: "Architectural photography journal — precise, spatial, understated luxury.",
    pillarSlugs: ["architecture", "acd"],
  },
  {
    id: "real-estate",
    label: "Real estate",
    motionPrompt:
      "Gentle push-in through bright interior, warm daylight, inviting residential atmosphere, smooth premium motion.",
    negativePrompt: "blurry, distorted, watermark, text overlay, cluttered, harsh flash",
    cropMode: "centre",
    captionVoice: "Residential storytelling — warm, clear, aspirational without hype.",
    pillarSlugs: ["real-estate", "residential"],
  },
  {
    id: "commercial",
    label: "Commercial / advertising",
    motionPrompt:
      "Confident slow orbit around product or brand moment, cinematic lighting, polished commercial energy, restrained.",
    negativePrompt: "blurry, distorted, watermark, text overlay, cheap look",
    cropMode: "attention",
    captionVoice: "Commercial photography — brand-forward, crisp, confident.",
    pillarSlugs: ["commercial", "advertising"],
  },
  {
    id: "corporate",
    label: "Corporate",
    motionPrompt:
      "Steady, professional camera drift across corporate environment, clean light, trustworthy and modern.",
    negativePrompt: "blurry, distorted, watermark, text overlay, chaotic motion",
    cropMode: "centre",
    captionVoice: "Corporate visual narrative — clear, professional, human.",
    pillarSlugs: ["corporate"],
  },
  {
    id: "editorial",
    label: "Editorial / journal",
    motionPrompt:
      "Subtle cinematic camera drift, natural light, premium photography motion, calm and elegant.",
    negativePrompt: "blurry, distorted, watermark, text overlay, low quality",
    cropMode: "attention",
    captionVoice: "BRIGHTLINE Journal — cinematic, restrained, sophisticated.",
    pillarSlugs: [],
  },
  {
    id: "travel",
    label: "Travel",
    motionPrompt:
      "Gentle cinematic drift across travel landscape or city light, natural atmosphere, quiet wanderlust, premium photography motion, calm and elegant.",
    negativePrompt: "blurry, distorted, watermark, text overlay, tourist cliché, shaky cam",
    cropMode: "attention",
    captionVoice:
      "BRIGHTLINE Travel — photographic, place-specific, restrained; note light, texture, and pace without hype.",
    pillarSlugs: ["travel"],
  },
];

function cleanPreset(row: unknown): MediaKitPreset | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim() : "";
  if (!id) return null;
  const crop =
    r.cropMode === "centre" || r.cropMode === "center"
      ? "centre"
      : r.cropMode === "top"
        ? "top"
        : "attention";
  return {
    id,
    label: typeof r.label === "string" && r.label.trim() ? r.label.trim() : id,
    motionPrompt:
      typeof r.motionPrompt === "string" && r.motionPrompt.trim()
        ? r.motionPrompt.trim()
        : DEFAULT_MEDIA_KIT_PRESETS.find((p) => p.id === "editorial")!.motionPrompt,
    negativePrompt:
      typeof r.negativePrompt === "string" && r.negativePrompt.trim()
        ? r.negativePrompt.trim()
        : "blurry, distorted, watermark, text overlay, low quality",
    cropMode: crop,
    captionVoice:
      typeof r.captionVoice === "string" && r.captionVoice.trim()
        ? r.captionVoice.trim()
        : "BRIGHTLINE Journal voice.",
    pillarSlugs: Array.isArray(r.pillarSlugs)
      ? r.pillarSlugs
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter(Boolean)
          .slice(0, 12)
      : [],
  };
}

export async function getMediaKitPresets(): Promise<MediaKitPreset[]> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: PRESETS_KEY },
      select: { value: true },
    });
    if (!setting?.value) return DEFAULT_MEDIA_KIT_PRESETS;
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MEDIA_KIT_PRESETS;
    const cleaned = parsed.map(cleanPreset).filter(Boolean) as MediaKitPreset[];
    if (!cleaned.length) return DEFAULT_MEDIA_KIT_PRESETS;
    // Ensure built-in defaults (e.g. travel) remain available after older saves.
    const ids = new Set(cleaned.map((p) => p.id));
    for (const preset of DEFAULT_MEDIA_KIT_PRESETS) {
      if (!ids.has(preset.id)) cleaned.push(preset);
    }
    return cleaned;
  } catch {
    return DEFAULT_MEDIA_KIT_PRESETS;
  }
}

export async function saveMediaKitPresets(input: unknown): Promise<MediaKitPreset[]> {
  const list = Array.isArray(input)
    ? (input.map(cleanPreset).filter(Boolean) as MediaKitPreset[])
    : [];
  const presets = list.length ? list : DEFAULT_MEDIA_KIT_PRESETS;
  await prisma.siteSetting.upsert({
    where: { key: PRESETS_KEY },
    update: { value: JSON.stringify(presets) },
    create: { key: PRESETS_KEY, value: JSON.stringify(presets) },
  });
  return presets;
}

export async function getMediaKitPresetById(id: string): Promise<MediaKitPreset> {
  const presets = await getMediaKitPresets();
  return presets.find((p) => p.id === id) ?? presets.find((p) => p.id === "editorial")! ?? DEFAULT_MEDIA_KIT_PRESETS[4]!;
}

export async function getPresetForPillar(pillar: string | null | undefined): Promise<MediaKitPreset> {
  const slug = (pillar || "").trim().toLowerCase();
  const presets = await getMediaKitPresets();
  if (slug) {
    const match = presets.find((p) => p.pillarSlugs.some((s) => s.toLowerCase() === slug));
    if (match) return match;
    const byId = presets.find((p) => p.id === slug);
    if (byId) return byId;
  }
  return presets.find((p) => p.id === "editorial") ?? DEFAULT_MEDIA_KIT_PRESETS[4]!;
}

export function sharpPositionForCrop(mode: MediaKitCropMode): "attention" | "centre" | "top" {
  if (mode === "top") return "top";
  if (mode === "centre") return "centre";
  return "attention";
}
