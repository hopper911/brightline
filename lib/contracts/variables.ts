import type { StudioClient, StudioInvoice, StudioProject } from "@prisma/client";
import { BRAND } from "@/lib/config/brand";

/** Placeholder keys without braces, e.g. `clientName` for `{{clientName}}`. */
export const CONTRACT_VARIABLE_KEYS = [
  "clientName",
  "clientCompany",
  "clientEmail",
  "clientPhone",
  "clientAddress",
  "projectTitle",
  "projectSlug",
  "projectLocation",
  "projectType",
  "shootDate",
  "deliveryDate",
  "invoiceNumber",
  "invoiceTotal",
  "invoiceBalanceDue",
  "brandName",
  "brandUrl",
  "brandEmail",
  "galleryLink",
  "todayDate",
] as const;

export type ContractVariableKey = (typeof CONTRACT_VARIABLE_KEYS)[number];

export type VariableMap = Record<string, string>;

const KEY_SET = new Set<string>(CONTRACT_VARIABLE_KEYS);

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  try {
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

function money(n: unknown): string {
  const numeric = Number(n ?? 0);
  if (Number.isNaN(numeric)) return "";
  return numeric.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * Build a flat map of replacement values for templates. Only known keys are filled;
 * custom keys can be supplied via `overrides`.
 */
export function buildVariableMap(input: {
  client: StudioClient;
  project?: StudioProject | null;
  invoice?: StudioInvoice | null;
  galleryLink?: string | null;
  overrides?: Record<string, unknown> | null;
}): VariableMap {
  const { client, project, invoice, galleryLink, overrides } = input;
  const address = [client.addressLine1, client.city, client.state, client.postalCode].filter(Boolean).join(", ");
  const map: VariableMap = {
    clientName: client.primaryContactName ?? "",
    clientCompany: client.companyName ?? "",
    clientEmail: client.email ?? "",
    clientPhone: client.phone ?? "",
    clientAddress: address,
    projectTitle: project?.title ?? "",
    projectSlug: project?.slug ?? "",
    projectLocation: project?.location ?? "",
    projectType: project?.projectType ?? project?.category ?? "",
    shootDate: fmtDate(project?.shootDate ?? undefined),
    deliveryDate: fmtDate(project?.deliveryDate ?? undefined),
    invoiceNumber: invoice != null ? String(invoice.invoiceNumber) : "",
    invoiceTotal: invoice != null ? money(invoice.total) : "",
    invoiceBalanceDue: invoice != null ? money(invoice.balanceRemaining) : "",
    brandName: BRAND.name,
    brandUrl: BRAND.url,
    brandEmail: BRAND.contact.email,
    galleryLink: galleryLink ?? "",
    todayDate: fmtDate(new Date()),
  };

  if (overrides && typeof overrides === "object") {
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null) continue;
      map[k] = String(v);
    }
  }

  return map;
}

/** Keys declared on a template (`variables` JSON: string[] or { key: description }). */
export function parseTemplateVariableKeys(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return Object.keys(raw as Record<string, unknown>);
  }
  return [];
}

/** Extract `{{placeholders}}` from HTML (non-greedy, word chars and dots). */
export function extractPlaceholdersFromHtml(html: string): string[] {
  const re = /\{\{([\w.]+)\}\}/g;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.add(m[1]);
  }
  return [...out];
}

export function isKnownVariableKey(key: string): key is ContractVariableKey {
  return KEY_SET.has(key);
}
