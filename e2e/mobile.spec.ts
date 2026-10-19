import { expect, test } from '@playwright/test';
import { openStudio } from './helpers.ts';

test.describe('small screens @mobile', () => {
  test('the HUD starts collapsed and expands on demand', async ({ page }) => {
    await openStudio(page, '/essays/ms-01');
    const toggle = page.getByRole('button', { name: /SYS \/\/ TYPOGRAPHIC HUD/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByLabel(/FONT SCALE/)).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByLabel(/FONT SCALE/)).toBeVisible();
  });

  for (const path of ['/essays/ms-01', '/essays/ms-03?view=tree', '/archive']) {
    test(`no horizontal scrolling on ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
