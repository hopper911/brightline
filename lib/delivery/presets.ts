/**
 * Bright Line standardized export presets — dimensions + folder layout metadata for
 * manifests, admin UI, and Sharp-based delivery jobs (see `export-presets.ts`).
 */

export type DeliveryPresetKind = "exact" | "cover" | "long_edge";

export type DeliveryPresetDef = {
  id: string;
  label: string;
  description: string;
  /** Under `PROJECT_NAME/` in client-facing folder spec */
  folderPath: string;
  aspectRatioLabel: string;
  kind: DeliveryPresetKind;
  width?: number;
  height?: number;
  longEdge?: number;
  format: "webp" | "jpeg";
};

export const DELIVERY_PRESETS: DeliveryPresetDef[] = [
  {
    id: "hero_desktop",
    label: "Hero desktop",
    description: "Primary web hero — landscape",
    folderPath: "03_HERO_CROPS/desktop_16x9",
    aspectRatioLabel: "16:9",
    kind: "exact",
    width: 2560,
    height: 1440,
    format: "webp",
  },
  {
    id: "hero_mobile",
    label: "Hero mobile",
    description: "Social-style vertical hero",
    folderPath: "03_HERO_CROPS/mobile_4x5",
    aspectRatioLabel: "4:5",
    kind: "exact",
    width: 1440,
    height: 1800,
    format: "webp",
  },
  {
    id: "grid_portrait",
    label: "Grid portrait",
    description: "Editorial grid — portrait",
    folderPath: "04_GRID_CROPS/portrait_4x5",
    aspectRatioLabel: "4:5",
    kind: "exact",
    width: 1200,
    height: 1500,
    format: "webp",
  },
  {
    id: "grid_square",
    label: "Grid square",
    description: "Uniform grid tiles",
    folderPath: "04_GRID_CROPS/square_1x1",
    aspectRatioLabel: "1:1",
    kind: "exact",
    width: 1200,
    height: 1200,
    format: "webp",
  },
  {
    id: "full_web",
    label: "Full web",
    description: "Long edge 2400px, maintains aspect",
    folderPath: "02_WEB_READY",
    aspectRatioLabel: "original",
    kind: "long_edge",
    longEdge: 2400,
    format: "webp",
  },
  {
    id: "thumbnail",
    label: "Thumbnail",
    description: "Quick previews — 800px long edge",
    folderPath: "05_THUMBNAILS",
    aspectRatioLabel: "original",
    kind: "long_edge",
    longEdge: 800,
    format: "webp",
  },
  {
    id: "instagram_feed",
    label: "Instagram feed",
    description: "4:5 feed post",
    folderPath: "06_SOCIAL/instagram_4x5",
    aspectRatioLabel: "4:5",
    kind: "exact",
    width: 1080,
    height: 1350,
    format: "webp",
  },
  {
    id: "story_reel",
    label: "Story / reel",
    description: "9:16 vertical",
    folderPath: "06_SOCIAL/story_9x16",
    aspectRatioLabel: "9:16",
    kind: "exact",
    width: 1080,
    height: 1920,
    format: "webp",
  },
  {
    id: "linkedin_banner",
    label: "LinkedIn banner",
    description: "Profile / company banner",
    folderPath: "06_SOCIAL/linkedin_banner",
    aspectRatioLabel: "1584:396",
    kind: "exact",
    width: 1584,
    height: 396,
    format: "webp",
  },
  {
    id: "youtube_thumbnail",
    label: "YouTube thumbnail",
    description: "16:9 thumbnail",
    folderPath: "06_SOCIAL/youtube_thumbnail",
    aspectRatioLabel: "16:9",
    kind: "exact",
    width: 1280,
    height: 720,
    format: "webp",
  },
];

export const DELIVERY_FOLDER_TREE_README = `
PROJECT_NAME/
├── 01_FINAL_FULL_RES/
├── 02_WEB_READY/
├── 03_HERO_CROPS/
│   ├── desktop_16x9/
│   └── mobile_4x5/
├── 04_GRID_CROPS/
│   ├── portrait_4x5/
│   └── square_1x1/
├── 05_THUMBNAILS/
├── 06_SOCIAL/
│   ├── instagram_4x5/
│   ├── story_9x16/
│   ├── linkedin_banner/
│   └── youtube_thumbnail/
└── 07_METADATA/
    ├── delivery-manifest.json
    ├── usage-notes.md
    └── image-size-guide.md
`.trim();

export function getPresetById(id: string): DeliveryPresetDef | undefined {
  return DELIVERY_PRESETS.find((p) => p.id === id);
}
