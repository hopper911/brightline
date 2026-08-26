/**
 * Public-facing credibility stats — keep claims aligned with visible portfolio evidence.
 * Do not reinstate inflated project counts without matching published case studies.
 */
export const CREDIBILITY = {
  stats: [
    { value: "NJ / NYC", label: "Metro focus", description: "Tri-State commercial work" },
    { value: "48hr", label: "Response time", description: "Initial inquiry" },
    { value: "5–7", label: "Proof days", description: "Standard turnaround" },
    { value: "10–14", label: "Final days", description: "Full delivery" },
  ],
  /** Compact trio used in CMS hero overrides */
  heroStrip: [
    { value: "NJ / NYC", label: "Metro" },
    { value: "48hr", label: "Reply" },
    { value: "5–7", label: "Proof days" },
  ],
  turnaround: {
    proofs: "5–7 days",
    finals: "10–14 days",
    rush: "On request",
  },
  licensing: {
    included: ["Web + social usage", "Brand guidelines", "Standard crops"],
    additional: ["Paid media", "Print", "OOH"],
    note: "Extended licensing quoted per project.",
  },
  faqs: [
    { question: "What's included in a typical shoot?", answer: "Pre-production, on-site capture, and post-production. Deliverables vary by package." },
    { question: "How far in advance should I book?", answer: "2–3 weeks for most East Coast projects. Rush availability on request." },
    { question: "Do you travel?", answer: "Yes. Travel is quoted separately based on location and scope." },
    { question: "What formats do you deliver?", answer: "High-res JPEGs and TIFFs, with crops for web, social, and print—plus organized naming and metadata where it helps your team ship." },
  ],
};

/** Detect CMS placeholder / inflated copy that must never render publicly. */
export function isPublicPlaceholderCopy(value: string | null | undefined): boolean {
  const t = (value ?? "").trim();
  if (!t) return true;
  if (/^update this caption\.?$/i.test(t)) return true;
  if (/^add image or video from r2\.?$/i.test(t)) return true;
  if (/^use this for a motion clip or detail\.?$/i.test(t)) return true;
  if (/^r2 media(?:\s+\d+)?$/i.test(t)) return true;
  if (/^recent project(?:\s+\d+)?$/i.test(t)) return true;
  if (/^behind the frame$/i.test(t)) return true;
  if (/^item title$/i.test(t) || /^item copy\.?$/i.test(t)) return true;
  if (/^block title$/i.test(t) || /^block copy\.?$/i.test(t)) return true;
  return false;
}

/** Soften unsupported scale claims in CMS stats (e.g. “500+ Projects”). */
export function sanitizePublicStatItem(item: {
  title: string;
  body: string;
  meta?: string;
}): { title: string; body: string; meta?: string } | null {
  const title = item.title.trim();
  const body = item.body.trim();
  const combo = `${title} ${body}`.toLowerCase();
  // Hide vague/unsupported portfolio-count stand-ins from public pages.
  if (/500\+/.test(combo) && /project/.test(combo)) return null;
  if (/^select$/i.test(title) && /case\s*stud/i.test(body)) return null;
  if (/case\s*stud/i.test(combo) && /^select$/i.test(title)) return null;
  if (isPublicPlaceholderCopy(title) && isPublicPlaceholderCopy(body)) return null;
  return {
    title: isPublicPlaceholderCopy(title) ? body : title,
    body: isPublicPlaceholderCopy(body) ? "" : body,
    meta: item.meta,
  };
}
