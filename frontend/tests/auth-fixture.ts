import { test as baseTest, expect, Page } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.resolve(__dirname, ".auth", "tenant.json");

/**
 * Authenticated test fixture for tenant dashboard tests.
 *
 * Usage:
 *   import { tenantTest } from "./auth-fixture";
 *   tenantTest("dashboard loads", async ({ page }) => {
 *     await page.goto("/");
 *     await expect(page.getByText("Dashboard")).toBeVisible();
 *   });
 */

export const tenantTest = baseTest.extend({
  storageState: AUTH_FILE,
});

/**
 * Helper to perform login via API and save state for reuse.
 * Call this once before running authenticated tests:
 *
 *   npx playwright test tests/auth-fixture.ts --project=setup
 *
 * Or run the login setup inline with:
 *   import { loginAndSaveState } from "./auth-fixture";
 */

export async function loginAndSaveState(page: Page) {
  await page.goto("/login");

  await page.getByLabel("API Key").fill("demo-api-key-123");
  await page.getByLabel("Email").fill("admin@al-baraka.com");
  await page.getByLabel("Password").fill("Admin123!");

  await page.getByRole("button", { name: "Sign In" }).click();

  await page.waitForURL(/^\/(?!login)/, { timeout: 10000 });

  await page.context().storageState({ path: AUTH_FILE });
}

baseTest.describe("Auth Setup (run once)", () => {
  baseTest("login and save auth state", async ({ page }) => {
    await loginAndSaveState(page);
  });
});

export { expect };
