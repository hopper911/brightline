/**
 * Rewrite Mirotech CMS JSON when R2 keys move (Studio hub projects + journal).
 */

import { normalizeCmsMediaKey } from "@/lib/admin-r2-mirotech-cms-keys";
import {
  getHubProject,
  listHubProjects,
  updateHubBlog,
  updateHubProject,
  type HubJournalPost,
  type HubProject,
} from "@/lib/dual-brand/studio-hub";
import { extractPublicMediaKey } from "@/lib/r2";

function mediaStringMatchesKey(value: string, oldKey: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === oldKey) return true;
  const asKey = normalizeCmsMediaKey(trimmed) ?? extractPublicMediaKey(trimmed);
  return asKey === oldKey;
}

/** Replace a stored media reference preserving URL vs key form. */
export function replaceMediaReferenceString(value: string, oldKey: string, newKey: string): string {
  if (!mediaStringMatchesKey(value, oldKey)) return value;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      u.pathname = `/${newKey}`;
      return u.toString();
    } catch {
      return newKey;
    }
  }
  if (trimmed.startsWith("/api/media/public")) {
    return `/api/media/public?key=${encodeURIComponent(newKey)}`;
  }
  return newKey;
}

function replaceInUnknown(value: unknown, oldKey: string, newKey: string): unknown {
  if (typeof value === "string") {
    return replaceMediaReferenceString(value, oldKey, newKey);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceInUnknown(item, oldKey, newKey));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = replaceInUnknown(v, oldKey, newKey);
    }
    return out;
  }
  return value;
}

function countMediaMatches(value: unknown, oldKey: string): number {
  if (typeof value === "string") {
    return mediaStringMatchesKey(value, oldKey) ? 1 : 0;
  }
  if (Array.isArray(value)) {
    return value.reduce((sum: number, item) => sum + countMediaMatches(item, oldKey), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce(
      (sum: number, v) => sum + countMediaMatches(v, oldKey),
      0
    );
  }
  return 0;
}

function rewriteHubProjectPayload(project: HubProject, oldKey: string, newKey: string): {
  payload: Record<string, unknown>;
  matches: number;
} {
  let matches = 0;
  const payload: Record<string, unknown> = {};

  const heroFields = [
    "heroImage",
    "thumbnailImage",
    "backgroundMedia",
    "backgroundPoster",
  ] as const;
  for (const field of heroFields) {
    const val = project[field];
    if (typeof val === "string" && mediaStringMatchesKey(val, oldKey)) {
      payload[field] = replaceMediaReferenceString(val, oldKey, newKey);
      matches += 1;
    }
  }

  if (project.sections?.length) {
    const sections = project.sections.map((section) => {
      const sectionMatches = countMediaMatches(section.data, oldKey);
      matches += sectionMatches;
      if (sectionMatches === 0) return section;
      return {
        ...section,
        data: replaceInUnknown(section.data, oldKey, newKey),
      };
    });
    payload.sections = sections;
  }

  return { payload, matches };
}

function rewriteHubBlogPayload(post: HubJournalPost, oldKey: string, newKey: string): {
  payload: Record<string, unknown>;
  matches: number;
} {
  let matches = 0;
  const payload: Record<string, unknown> = {};

  const heroFields = ["heroImage", "backgroundMedia", "backgroundPoster"] as const;
  for (const field of heroFields) {
    const val = post[field];
    if (typeof val === "string" && mediaStringMatchesKey(val, oldKey)) {
      payload[field] = replaceMediaReferenceString(val, oldKey, newKey);
      matches += 1;
    }
  }

  if (post.articlePayload) {
    const apMatches = countMediaMatches(post.articlePayload, oldKey);
    matches += apMatches;
    if (apMatches > 0) {
      payload.articlePayload = replaceInUnknown(post.articlePayload, oldKey, newKey);
    }
  }

  return { payload, matches };
}

function replaceInUnknownMulti(value: unknown, keyMap: Map<string, string>): unknown {
  if (typeof value === "string") {
    let out = value;
    for (const [from, to] of keyMap) {
      if (mediaStringMatchesKey(out, from)) {
        out = replaceMediaReferenceString(out, from, to);
      }
    }
    return out;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceInUnknownMulti(item, keyMap));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = replaceInUnknownMulti(v, keyMap);
    }
    return out;
  }
  return value;
}

function countMediaMatchesMulti(value: unknown, keyMap: Map<string, string>): number {
  if (typeof value === "string") {
    for (const from of keyMap.keys()) {
      if (mediaStringMatchesKey(value, from)) return 1;
    }
    return 0;
  }
  if (Array.isArray(value)) {
    return value.reduce((sum: number, item) => sum + countMediaMatchesMulti(item, keyMap), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce(
      (sum: number, v) => sum + countMediaMatchesMulti(v, keyMap),
      0
    );
  }
  return 0;
}

function rewriteHubProjectPayloadMulti(project: HubProject, keyMap: Map<string, string>): {
  payload: Record<string, unknown>;
  matches: number;
} {
  let matches = 0;
  const payload: Record<string, unknown> = {};

  const heroFields = [
    "heroImage",
    "thumbnailImage",
    "backgroundMedia",
    "backgroundPoster",
  ] as const;
  for (const field of heroFields) {
    const val = project[field];
    if (typeof val === "string") {
      let next = val;
      for (const [from, to] of keyMap) {
        if (mediaStringMatchesKey(next, from)) {
          next = replaceMediaReferenceString(next, from, to);
          matches += 1;
        }
      }
      if (next !== val) payload[field] = next;
    }
  }

  if (project.sections?.length) {
    const sections = project.sections.map((section) => {
      const sectionMatches = countMediaMatchesMulti(section.data, keyMap);
      matches += sectionMatches;
      if (sectionMatches === 0) return section;
      return {
        ...section,
        data: replaceInUnknownMulti(section.data, keyMap),
      };
    });
    payload.sections = sections;
  }

  return { payload, matches };
}

function rewriteHubBlogPayloadMulti(post: HubJournalPost, keyMap: Map<string, string>): {
  payload: Record<string, unknown>;
  matches: number;
} {
  let matches = 0;
  const payload: Record<string, unknown> = {};

  const heroFields = ["heroImage", "backgroundMedia", "backgroundPoster"] as const;
  for (const field of heroFields) {
    const val = post[field];
    if (typeof val === "string") {
      let next = val;
      for (const [from, to] of keyMap) {
        if (mediaStringMatchesKey(next, from)) {
          next = replaceMediaReferenceString(next, from, to);
          matches += 1;
        }
      }
      if (next !== val) payload[field] = next;
    }
  }

  if (post.articlePayload) {
    const apMatches = countMediaMatchesMulti(post.articlePayload, keyMap);
    matches += apMatches;
    if (apMatches > 0) {
      payload.articlePayload = replaceInUnknownMulti(post.articlePayload, keyMap);
    }
  }

  return { payload, matches };
}

/** Apply many key rewrites in one hub pass (reorg batch). */
export async function rewriteMirotechCmsKeyReferencesBatch(
  pairs: Array<{ from: string; to: string }>
): Promise<MirotechCmsRewriteResult> {
  const keyMap = new Map<string, string>();
  for (const p of pairs) {
    const from = p.from.replace(/^\/+/, "");
    const to = p.to.replace(/^\/+/, "");
    if (from && to && from !== to) keyMap.set(from, to);
  }
  if (!keyMap.size) {
    return { cmsUpdates: 0, projectsUpdated: 0, blogsUpdated: 0, details: [] };
  }

  const projects = await listHubProjects();
  let cmsUpdates = 0;
  let projectsUpdated = 0;
  let blogsUpdated = 0;
  const details: string[] = [];

  for (const summary of projects) {
    const project = await getHubProject(summary.id);
    if (!project) continue;

    const { payload, matches } = rewriteHubProjectPayloadMulti(project, keyMap);
    if (matches > 0) {
      await updateHubProject(project.id, payload);
      projectsUpdated += 1;
      cmsUpdates += matches;
      details.push(`project:${project.slug} (${matches})`);
    }

    const blogs = project.journalPostsFull ?? [];
    for (const blog of blogs) {
      const blogRewrite = rewriteHubBlogPayloadMulti(blog, keyMap);
      if (blogRewrite.matches > 0) {
        await updateHubBlog(project.id, blogRewrite.payload);
        blogsUpdated += 1;
        cmsUpdates += blogRewrite.matches;
        details.push(`blog:${project.slug}/${blog.slug} (${blogRewrite.matches})`);
      }
    }
  }

  return { cmsUpdates, projectsUpdated, blogsUpdated, details };
}

export type MirotechCmsRewriteResult = {
  cmsUpdates: number;
  projectsUpdated: number;
  blogsUpdated: number;
  details: string[];
};

/**
 * Rewrite Mirotech Studio hub CMS JSON for oldKey → newKey.
 * Does not move R2 objects — call after successful R2 move.
 */
export async function rewriteMirotechCmsKeyReferences(
  oldKey: string,
  newKey: string
): Promise<MirotechCmsRewriteResult> {
  const from = oldKey.replace(/^\/+/, "");
  const to = newKey.replace(/^\/+/, "");
  if (from === to) {
    return { cmsUpdates: 0, projectsUpdated: 0, blogsUpdated: 0, details: [] };
  }

  const projects = await listHubProjects();
  let cmsUpdates = 0;
  let projectsUpdated = 0;
  let blogsUpdated = 0;
  const details: string[] = [];

  for (const summary of projects) {
    const project = await getHubProject(summary.id);
    if (!project) continue;

    const { payload, matches } = rewriteHubProjectPayload(project, from, to);
    if (matches > 0) {
      await updateHubProject(project.id, payload);
      projectsUpdated += 1;
      cmsUpdates += matches;
      details.push(`project:${project.slug} (${matches})`);
    }

    const blogs = project.journalPostsFull ?? [];
    for (const blog of blogs) {
      const blogRewrite = rewriteHubBlogPayload(blog, from, to);
      if (blogRewrite.matches > 0) {
        await updateHubBlog(project.id, blogRewrite.payload);
        blogsUpdated += 1;
        cmsUpdates += blogRewrite.matches;
        details.push(`blog:${project.slug}/${blog.slug} (${blogRewrite.matches})`);
      }
    }
  }

  return { cmsUpdates, projectsUpdated, blogsUpdated, details };
}
