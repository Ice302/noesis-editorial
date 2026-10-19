import { expect, test } from '@playwright/test';

test.describe('archive index', () => {
  test('lists every essay and searches full text with a snippet', async ({ page }) => {
    await page.goto('/archive');
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(4);

    await page.getByLabel('Search the archive').fill('Locke');
    await expect(page).toHaveURL(/\/archive\?q=Locke$/);
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
    await expect(page.locator('mark.editorial-highlight').first()).toHaveText('Locke');

    await page
      .getByRole('link', { name: 'The Commonplace Book: Reading With a Pen in Hand' })
      .click();
    await expect(page).toHaveURL(/\/essays\/ms-03$/);
  });

  test('restores a shared search from the URL and filters by category', async ({ page }) => {
    await page.goto('/archive?q=essay');
    await expect(page.getByLabel('Search the archive')).toHaveValue('essay');
    await page.getByRole('button', { name: 'LITERARY THEORY' }).click();
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
  });
});

test('RSS feed is valid XML with one item per essay', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('xml');
  const xml = await response.text();
  expect(xml.match(/<item>/g)).toHaveLength(4);
  expect(xml).toContain('<link>http://localhost:4180/essays/ms-01</link>');
});
