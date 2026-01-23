import { chromium, FullConfig } from "@playwright/test";

/**
 * Global setup for Playwright E2E tests.
 * This runs once before all tests.
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Example: Set up authenticated state
  // This creates a storage state that can be reused across tests

  // For now, we just verify the app is running
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(baseURL || "http://localhost:3000", { timeout: 30000 });
    console.log("Application is running at", baseURL);
  } catch (error) {
    console.warn(
      "Could not connect to application. Make sure it's running before tests."
    );
  } finally {
    await browser.close();
  }
}

export default globalSetup;
