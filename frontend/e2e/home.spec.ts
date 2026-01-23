import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads successfully", async ({ page }) => {
    const response = await page.goto("/");

    // Should get a successful response
    expect(response?.status()).toBeLessThan(400);
  });

  test("has proper title", async ({ page }) => {
    await page.goto("/");

    // Check for any title
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("is responsive - mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should load without horizontal scroll
    const body = page.locator("body");
    const boundingBox = await body.boundingBox();

    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }
  });

  test("is responsive - tablet viewport", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    // Page should load without issues
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("is responsive - desktop viewport", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    // Page should load without issues
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out known acceptable errors (like third-party scripts)
    const significantErrors = errors.filter(
      (error) =>
        !error.includes("favicon") &&
        !error.includes("analytics") &&
        !error.includes("hydration")
    );

    expect(significantErrors).toHaveLength(0);
  });
});
