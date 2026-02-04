import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "kiril.mironyuk@gmail.com";
const ADMIN_PASSWORD = "12345kiril";

test("admin login with credentials", async ({ page }) => {
  await page.goto("https://brightlinephotography.co/admin/login", {
    waitUntil: "networkidle",
  });

  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

  const emailInput = page.getByPlaceholder(/email/i);
  const passwordInput = page.getByPlaceholder(/password/i);
  const submitBtn = page.getByRole("button", { name: /sign in/i });

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);
  await submitBtn.click();

  await page.waitForURL(/\/admin\//, { timeout: 10000 });

  const url = page.url();
  expect(url).toMatch(/\/admin\//);
  expect(url).not.toContain("/admin/login");
});
