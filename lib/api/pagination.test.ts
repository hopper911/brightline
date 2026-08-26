import { describe, expect, it } from "vitest";
import { LIST_PAGE_DEFAULT, listMeta, parseListPagination } from "@/lib/api/pagination";

describe("list pagination helpers", () => {
  it("defaults page and pageSize", () => {
    expect(parseListPagination(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: LIST_PAGE_DEFAULT,
      skip: 0,
    });
  });

  it("clamps pageSize to max 100", () => {
    expect(parseListPagination(new URLSearchParams("page=2&pageSize=500"))).toEqual({
      page: 2,
      pageSize: 100,
      skip: 100,
    });
  });

  it("builds list meta", () => {
    expect(listMeta(52, 2, 25)).toEqual({
      page: 2,
      pageSize: 25,
      total: 52,
      totalPages: 3,
    });
  });
});
