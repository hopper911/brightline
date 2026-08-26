/**
 * Pagination conventions for list-heavy admin / studio routes.
 *
 * - Query: `?page=1&pageSize=25` (1-indexed page; pageSize default 25, max 100)
 * - Response: `{ ok: true, items, page, pageSize, total, totalPages }`
 * - Prefer cursor pagination only when a route already uses cursors; do not mix styles
 *   on the same resource.
 */
export const LIST_PAGE_DEFAULT = 25;
export const LIST_PAGE_MAX = 100;

export function parseListPagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  skip: number;
} {
  const pageRaw = Number(searchParams.get("page") || "1");
  const sizeRaw = Number(searchParams.get("pageSize") || String(LIST_PAGE_DEFAULT));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const pageSize = Number.isFinite(sizeRaw)
    ? Math.min(LIST_PAGE_MAX, Math.max(1, Math.floor(sizeRaw)))
    : LIST_PAGE_DEFAULT;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function listMeta(total: number, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
