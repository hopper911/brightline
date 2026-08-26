import { prisma } from "@/lib/prisma";

export const GOOGLE_MAPS_CONTRIBUTOR_SETTING_KEY = "google_maps_contributor:v1";

/** Default Local Guide / Maps contributor id from Kiril’s public profile. */
export const DEFAULT_GOOGLE_MAPS_CONTRIBUTOR_ID = "109203527785619718155";

export type GoogleMapsContributorSettings = {
  contributorId: string;
  /** Optional display-name fallback when URI does not include the id. */
  displayNameHint: string;
  /** Optional R2 (or other public) URL for the testimonial avatar. */
  avatarUrl: string;
};

export const DEFAULT_GOOGLE_MAPS_CONTRIBUTOR: GoogleMapsContributorSettings = {
  contributorId: DEFAULT_GOOGLE_MAPS_CONTRIBUTOR_ID,
  displayNameHint: "Kiril",
  avatarUrl: "",
};

export const DEFAULT_GOOGLE_REVIEW_AVATAR = "/brand/brightline-bl-monogram.png";

export function normalizeGoogleMapsContributor(input: unknown): GoogleMapsContributorSettings {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const contributorId =
    typeof row.contributorId === "string" && row.contributorId.trim()
      ? row.contributorId.trim()
      : DEFAULT_GOOGLE_MAPS_CONTRIBUTOR.contributorId;
  const displayNameHint =
    typeof row.displayNameHint === "string" && row.displayNameHint.trim()
      ? row.displayNameHint.trim()
      : DEFAULT_GOOGLE_MAPS_CONTRIBUTOR.displayNameHint;
  const avatarUrl =
    typeof row.avatarUrl === "string" && row.avatarUrl.trim() ? row.avatarUrl.trim() : "";
  return { contributorId, displayNameHint, avatarUrl };
}

export async function getGoogleMapsContributorSettings(): Promise<GoogleMapsContributorSettings> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: GOOGLE_MAPS_CONTRIBUTOR_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return DEFAULT_GOOGLE_MAPS_CONTRIBUTOR;
    return normalizeGoogleMapsContributor(JSON.parse(setting.value));
  } catch {
    return DEFAULT_GOOGLE_MAPS_CONTRIBUTOR;
  }
}

export async function saveGoogleMapsContributorSettings(
  input: unknown
): Promise<GoogleMapsContributorSettings> {
  const settings = normalizeGoogleMapsContributor(input);
  await prisma.siteSetting.upsert({
    where: { key: GOOGLE_MAPS_CONTRIBUTOR_SETTING_KEY },
    update: { value: JSON.stringify(settings) },
    create: { key: GOOGLE_MAPS_CONTRIBUTOR_SETTING_KEY, value: JSON.stringify(settings) },
  });
  return settings;
}
