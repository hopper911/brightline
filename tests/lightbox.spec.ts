import { test, expect } from "@playwright/test";

test("portfolio lightbox opens", async ({ page }) => {
  await page.goto("https://brightlinephotography.co/portfolio/fashion/fashion-01", {
    waitUntil: "networkidle",
  });

  const firstThumb = page.getByRole("button", { name: /open aurum atelier image/i }).first();
  await expect(firstThumb).toBeVisible();
  await firstThumb.click();

  const closeButton = page.getByRole("button", { name: /close/i });
  await expect(closeButton).toBeVisible();
  await closeButton.click();
  await expect(closeButton).toBeHidden();
});
