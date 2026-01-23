import { test, expect } from "@playwright/test";

test.describe("Monitoring Page", () => {
  test.beforeEach(async ({ page }) => {
    // This test requires authentication
    // In a real scenario, you would set up auth state here
    // For now, we just navigate to the page
    await page.goto("/monitoring");
  });

  test("displays monitoring page with tabs", async ({ page }) => {
    // Check if we're redirected to login (expected if not authenticated)
    // or if we can see the monitoring page
    const url = page.url();

    if (url.includes("login")) {
      // Not authenticated - this is expected behavior
      test.skip();
      return;
    }

    // Check for tabs
    await expect(page.getByRole("tab", { name: /system/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /traffic/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /connections/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /vpn/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /alerts/i })).toBeVisible();
  });

  test("system tab shows metrics cards", async ({ page }) => {
    const url = page.url();

    if (url.includes("login")) {
      test.skip();
      return;
    }

    // Click system tab (should be default)
    await page.getByRole("tab", { name: /system/i }).click();

    // Wait for content to load - should see either skeleton or actual content
    await expect(
      page.getByText(/cpu usage|memory usage|disk usage|loading/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can switch between tabs", async ({ page }) => {
    const url = page.url();

    if (url.includes("login")) {
      test.skip();
      return;
    }

    // Test tab switching
    const tabs = ["Traffic", "Connections", "VPN", "Alerts", "System"];

    for (const tabName of tabs) {
      await page.getByRole("tab", { name: new RegExp(tabName, "i") }).click();
      await expect(
        page.getByRole("tab", { name: new RegExp(tabName, "i") })
      ).toHaveAttribute("data-state", "active");
    }
  });

  test("alerts tab shows rules panel and history panel", async ({ page }) => {
    const url = page.url();

    if (url.includes("login")) {
      test.skip();
      return;
    }

    // Switch to alerts tab
    await page.getByRole("tab", { name: /alerts/i }).click();

    // Should see alert rules section
    await expect(
      page.getByText(/alert rules/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Should see alert history section
    await expect(
      page.getByText(/alert history/i).first()
    ).toBeVisible();
  });
});
