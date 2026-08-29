export const COMPLETION_QUEUE_SECTIONS = [
  "needs-content",
  "needs-media",
  "needs-seo",
  "ready-for-review",
  "approved-waiting-publish",
  "publish-failed",
  "published-needs-verification",
] as const;

export type CompletionQueueSectionId = (typeof COMPLETION_QUEUE_SECTIONS)[number];

export const COMPLETION_QUEUE_SECTION_LABELS: Record<CompletionQueueSectionId, string> = {
  "needs-content": "Needs content",
  "needs-media": "Needs media",
  "needs-seo": "Needs SEO",
  "ready-for-review": "Ready for review",
  "approved-waiting-publish": "Approved / waiting publish",
  "publish-failed": "Publish failed",
  "published-needs-verification": "Published / needs verification",
};
