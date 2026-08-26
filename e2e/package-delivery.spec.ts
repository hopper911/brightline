import { expect, test } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type SmokeArtifact = {
  accessToken: string;
  expiredAccessToken: string;
  itemId: string | null;
  packageUrl: string;
};

function loadSmoke(): SmokeArtifact {
  const path = join(process.cwd(), "tmp", "delivery-smoke.json");
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}. Run: DELIVERY_SMOKE_WRITE_JSON=1 npm run seed:delivery-smoke:empty`
    );
  }
  return JSON.parse(readFileSync(path, "utf8")) as SmokeArtifact;
}

test.describe("delivery package vertical", () => {
  const smoke = loadSmoke();

  test("opens seeded package page", async ({ page }) => {
    const res = await page.goto(`/package/${smoke.accessToken}`);
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/smoke/i);
    await expect(page.getByText("BRIGHTLINE PHOTOGRAPHY")).toBeVisible();
  });

  test("rejects wrong token (404)", async ({ page }) => {
    const res = await page.goto("/package/definitely-not-a-real-token-zzzz");
    expect(res?.status()).toBe(404);
  });

  test("rejects expired package token (404)", async ({ page }) => {
    const res = await page.goto(`/package/${smoke.expiredAccessToken}`);
    expect(res?.status()).toBe(404);
  });

  test("manifest API allows valid token and rejects IDOR/expiry", async ({ request }) => {
    const ok = await request.get(`/api/package/${smoke.accessToken}/manifest`);
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.ok).toBe(true);
    expect(body.manifest).toBeTruthy();

    const wrong = await request.get("/api/package/wrong-token-zzzzzzzzzzzz/manifest");
    expect(wrong.status()).toBe(404);

    const expired = await request.get(`/api/package/${smoke.expiredAccessToken}/manifest`);
    expect(expired.status()).toBe(404);
  });

  test("download rejects foreign item id (IDOR)", async ({ request }) => {
    test.skip(!smoke.itemId, "No selected item in smoke seed");
    const foreignItem = "clxxxxxxxxxxxxxxxxxxxx";
    const res = await request.get(
      `/api/package/${smoke.accessToken}/items/${foreignItem}/download`
    );
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
