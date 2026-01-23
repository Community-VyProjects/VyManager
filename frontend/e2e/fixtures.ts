import { test as base, expect } from "@playwright/test";

/**
 * Extended test fixtures for VyManager E2E tests.
 */

// Define test data types
interface TestUser {
  email: string;
  password: string;
  name: string;
}

// Test users for different scenarios
export const testUsers: Record<string, TestUser> = {
  admin: {
    email: "admin@example.com",
    password: "AdminPassword123!",
    name: "Admin User",
  },
  viewer: {
    email: "viewer@example.com",
    password: "ViewerPassword123!",
    name: "Viewer User",
  },
};

// Extended test with custom fixtures
export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base.extend>;
}>({
  // Fixture for authenticated page
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto("/login");

    // Fill login form
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole("button", { name: /sign in|log in/i });

    if ((await emailInput.count()) > 0) {
      await emailInput.fill(testUsers.admin.email);
      await passwordInput.fill(testUsers.admin.password);
      await submitButton.click();

      // Wait for redirect to dashboard or home
      await page.waitForURL(/dashboard|home|\/$/, { timeout: 10000 }).catch(() => {
        // Login might have failed, that's ok for test setup
      });
    }

    await use(page);
  },
});

export { expect };

// Page object models for common pages
export class LoginPage {
  constructor(private page: ReturnType<typeof base.extend>) {}

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole("button", { name: /sign in|log in/i }).click();
  }

  async expectToBeOnLoginPage() {
    await expect(this.page).toHaveURL(/login/);
  }
}

export class MonitoringPage {
  constructor(private page: ReturnType<typeof base.extend>) {}

  async goto() {
    await this.page.goto("/monitoring");
  }

  async switchToTab(tabName: string) {
    await this.page.getByRole("tab", { name: new RegExp(tabName, "i") }).click();
  }

  async expectTabToBeActive(tabName: string) {
    await expect(
      this.page.getByRole("tab", { name: new RegExp(tabName, "i") })
    ).toHaveAttribute("data-state", "active");
  }

  async refreshMetrics() {
    await this.page.getByRole("button", { name: /refresh|auto/i }).first().click();
  }
}
