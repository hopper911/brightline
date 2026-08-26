/**
 * Thin wrappers around CMS/env gates. Defaults keep Design & résumé off public surfaces.
 * Do not flip production defaults here.
 */

import { cache } from "react";
import { getDesignSectionSettings } from "@/lib/design-section-settings";
import { prisma } from "@/lib/prisma";

export const RESUME_PAGE_SETTING_KEY = "resume_page:v1";

export type ResumePageSettings = {
  enabled: boolean;
  downloadUrl: string;
  linkedinUrl: string;
  githubUrl: string;
};

export const DEFAULT_RESUME_PAGE_SETTINGS: ResumePageSettings = {
  enabled: false,
  downloadUrl: "",
  linkedinUrl: "",
  githubUrl: "",
};

function cleanUrl(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (!s) return "";
  if (s.startsWith("/") || s.startsWith("https://") || s.startsWith("http://")) return s;
  return "";
}

export function normalizeResumePageSettings(input: unknown): ResumePageSettings {
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : DEFAULT_RESUME_PAGE_SETTINGS.enabled,
    downloadUrl: cleanUrl(o.downloadUrl) || DEFAULT_RESUME_PAGE_SETTINGS.downloadUrl,
    linkedinUrl: cleanUrl(o.linkedinUrl) || DEFAULT_RESUME_PAGE_SETTINGS.linkedinUrl,
    githubUrl: cleanUrl(o.githubUrl) || DEFAULT_RESUME_PAGE_SETTINGS.githubUrl,
  };
}

export const getResumePageSettings = cache(async (): Promise<ResumePageSettings> => {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: RESUME_PAGE_SETTING_KEY },
      select: { value: true },
    });
    if (!row?.value) return { ...DEFAULT_RESUME_PAGE_SETTINGS };
    return normalizeResumePageSettings(JSON.parse(row.value));
  } catch {
    return { ...DEFAULT_RESUME_PAGE_SETTINGS };
  }
});

export async function saveResumePageSettings(input: unknown): Promise<ResumePageSettings> {
  const settings = normalizeResumePageSettings(input);
  await prisma.siteSetting.upsert({
    where: { key: RESUME_PAGE_SETTING_KEY },
    update: { value: JSON.stringify(settings) },
    create: { key: RESUME_PAGE_SETTING_KEY, value: JSON.stringify(settings) },
  });
  return settings;
}

export type FeatureFlags = {
  designPortfolioEnabled: boolean;
  designNavEnabled: boolean;
  homepageDigitalSectionEnabled: boolean;
  resumePageEnabled: boolean;
  employmentInquiryEnabled: boolean;
};

export const getFeatureFlags = cache(async (): Promise<FeatureFlags> => {
  const [design, resume] = await Promise.all([
    getDesignSectionSettings(),
    getResumePageSettings(),
  ]);
  return {
    designPortfolioEnabled: design.enabled,
    designNavEnabled: design.enabled && design.showInNav,
    homepageDigitalSectionEnabled: design.enabled && design.showOnHome,
    resumePageEnabled: resume.enabled,
    employmentInquiryEnabled: true,
  };
});
