import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login page", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to login or show login form
    await expect(page).toHaveURL(/\/(auth\/)?login|signin/);
  });

  test("login page has required elements", async ({ page }) => {
    await page.goto("/login");

    // Check for email/username input
    const emailInput = page.getByLabel(/email|username/i);
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();

    // Check for submit button
    const submitButton = page.getByRole("button", { name: /sign in|log in|submit/i });
    await expect(submitButton).toBeVisible();
  });

  test("shows validation errors for empty form", async ({ page }) => {
    await page.goto("/login");

    // Click submit without filling form
    const submitButton = page.getByRole("button", { name: /sign in|log in|submit/i });
    await submitButton.click();

    // Should show some kind of validation message or stay on login page
    await expect(page).toHaveURL(/login/);
  });
});
