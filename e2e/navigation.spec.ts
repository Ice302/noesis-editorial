import { expect, test } from '@playwright/test';
import { openStudio } from './helpers.ts';

test.describe('routes and metadata', () => {
  test('home opens the studio on the first essay, canonical to its own URL', async ({ page }) => {
    await openStudio(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'The Cartography of Forgetting'
    );
    await expect(page).toHaveTitle(/The Cartography of Forgetting.*NOĒSIS/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/essays\/ms-01$/);
  });

  test('each essay has its own prerendered page and preview metadata', async ({ page }) => {
    const response = await openStudio(page, '/essays/ms-04');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('The Essay as Form');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /The Essay as Form/
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(jsonLd!)).toMatchObject({ '@type': 'Article', datePublished: '2026-10-12' });
  });

  test('spine links navigate between essays and keep the open panel', async ({ page }) => {
    await openStudio(page, '/essays/ms-01');
    await page.keyboard.press('3');
    await expect(page).toHaveURL(/\/essays\/ms-01\?view=tree$/);
    await page.getByRole('link', { name: /The Commonplace Book/ }).click();
    await expect(page).toHaveURL(/\/essays\/ms-03\?view=tree$/);
    await expect(page.getByText('MODE: TREE LAYOUT')).toBeVisible();
    await page.keyboard.press('1');
    await expect(page).toHaveURL(/\/essays\/ms-03$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('The Commonplace Book');
  });

  test('[ and ] step through essays', async ({ page }) => {
    await openStudio(page, '/essays/ms-01');
    await page.keyboard.press(']');
    await expect(page).toHaveURL(/\/essays\/ms-02$/);
    await page.keyboard.press('[');
    await expect(page).toHaveURL(/\/essays\/ms-01$/);
  });

  test('legacy ?essay= links redirect to the essay URL', async ({ page }) => {
    await page.goto('/?essay=ms-03&view=tree');
    await expect(page).toHaveURL(/\/essays\/ms-03\?view=tree$/);
  });

  test('unknown essays get the archive’s 404 page', async ({ page }) => {
    const response = await page.goto('/essays/ms-99');
    expect(response?.status()).toBe(404);
  });
});

test.describe('workspace tabs', () => {
  test('follow the ARIA tabs keyboard pattern', async ({ page }) => {
    await openStudio(page, '/essays/ms-01');
    const reader = page.getByRole('tab', { name: '01. Aeon Spread' });
    await reader.focus();
    await page.keyboard.press('ArrowRight');
    const studio = page.getByRole('tab', { name: '02. Manuscript Studio' });
    await expect(studio).toHaveAttribute('aria-selected', 'true');
    await expect(studio).toBeFocused();
    await expect(page.getByRole('toolbar', { name: 'Manuscript editing' })).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: '04. Analog Log' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await page.keyboard.press('Home');
    await expect(reader).toHaveAttribute('aria-selected', 'true');
  });

  test('reading progress advances as the essay scrolls', async ({ page }) => {
    await openStudio(page, '/essays/ms-01');
    const bar = page.getByRole('progressbar', { name: 'Reading progress' });
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
    await page.mouse.wheel(0, 2500);
    await expect
      .poll(async () => Number(await bar.getAttribute('aria-valuenow')))
      .toBeGreaterThan(0);
  });
});
