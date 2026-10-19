import type { Page } from '@playwright/test';

/**
 * Opens a studio URL and waits until the app has hydrated and restored its
 * state (the layout sets `data-hydrated`), so keyboard shortcuts and element
 * handlers are attached before the test starts typing.
 */
export async function openStudio(page: Page, path: string) {
  const response = await page.goto(path);
  await page.locator('[data-hydrated]').waitFor();
  return response;
}
