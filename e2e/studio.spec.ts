import { expect, test, type Page } from '@playwright/test';
import { openStudio } from './helpers.ts';

async function appendToParagraph(page: Page, idx: number, text: string) {
  const para = page.locator(`#para-${idx}`);
  await para.click();
  await page.keyboard.press('End');
  await page.keyboard.type(text);
}

test.describe('Manuscript Studio (local mode)', () => {
  test('edit, commit a revision, view the redline and restore the archive', async ({ page }) => {
    await openStudio(page, '/essays/ms-02?view=editor');
    const words = page.getByText(/\d+ WORDS · \d+ MIN READ/);
    const before = await words.textContent();

    await appendToParagraph(page, 0, ' Silence, too, is an argument.');
    await expect(words).not.toHaveText(before!);

    const panel = page.getByRole('region', { name: 'Revision History' });
    await expect(panel.getByText('WORKING DRAFT')).toBeVisible();
    await panel.getByPlaceholder('Note for this revision…').fill('add closing line');
    await panel.getByRole('button', { name: 'COMMIT R1' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Committed R1 in this browser.' })
    ).toBeVisible();
    await expect(panel.getByText('add closing line')).toBeVisible();

    // Redline of R1 against the archive shows the inserted words.
    await panel.getByRole('button', { name: 'REDLINE' }).first().click();
    await expect(page.locator('#para-0 ins.redline-ins')).toContainText(
      'Silence, too, is an argument.'
    );
    await page.getByRole('button', { name: 'CLOSE ✕' }).click();

    // The revision survives a reload (localStorage).
    await page.reload();
    await expect(
      page.getByRole('region', { name: 'Revision History' }).getByText('R1', { exact: true })
    ).toBeVisible();

    await page
      .getByRole('region', { name: 'Revision History' })
      .getByRole('button', { name: 'RESTORE' })
      .last()
      .click();
    await expect(page.getByRole('button', { name: /COMMIT R2/ })).toBeEnabled();
    await expect(page.locator('#para-0')).not.toContainText('Silence, too, is an argument.');
  });

  test('highlight tool wraps the selection in an editorial mark', async ({ page }) => {
    await openStudio(page, '/essays/ms-01?view=editor');
    await page.locator('#para-1').evaluate((el) => {
      const text = el.firstChild!;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 13);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(range);
    });
    await page.getByRole('button', { name: '✦ Highlight' }).click();
    await expect(page.locator('#para-1 mark.editorial-highlight')).toHaveText('Four centurie');
  });
});

test.describe('argument tree', () => {
  test('arrow keys walk the tree and Read § jumps to the paragraph', async ({ page }) => {
    await openStudio(page, '/essays/ms-01?view=tree');
    const root = page.locator('[data-node-id="n0"]');
    await root.focus();
    await page.keyboard.press('ArrowUp'); // first child
    await expect(page.locator('[data-node-id="n1"]')).toBeFocused();
    await page.keyboard.press('ArrowRight'); // next sibling
    await expect(page.locator('[data-node-id="n2"]')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowDown'); // back to parent
    await expect(root).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight'); // n3: Borges, §04
    await expect(page.getByText('BORGES: FUNES & PRUNING').last()).toBeVisible();
    await page.getByRole('button', { name: /READ §04 IN SPREAD/ }).click();
    await expect(page).toHaveURL(/\/essays\/ms-01$/);
    await expect(page.locator('#para-3')).toBeFocused();
  });

  test('zoom controls change the zoom level', async ({ page }) => {
    await openStudio(page, '/essays/ms-02?view=tree');
    const zoom = page.getByRole('group', { name: 'Zoom' });
    const before = await zoom.textContent();
    await zoom.getByRole('button', { name: 'Zoom in' }).click();
    await expect(zoom).not.toHaveText(before!);
  });
});

test.describe('analog log', () => {
  test('tick a task and rapid-log an entry', async ({ page }) => {
    await openStudio(page, '/essays/ms-01?view=analog');
    const task = page.getByRole('checkbox', { name: /Cross-check Jorge Luis Borges/ });
    await expect(task).toHaveAttribute('aria-checked', 'false');
    await task.click();
    await expect(task).toHaveAttribute('aria-checked', 'true');

    await page.getByLabel('Entry text').fill('Send Issue IV to the printer');
    await page.getByRole('button', { name: 'LOG', exact: true }).click();
    await expect(page.getByText('Send Issue IV to the printer')).toBeVisible();
  });
});

test.describe('HUD', () => {
  test('font scale slider drives the essay typography', async ({ page }) => {
    await openStudio(page, '/essays/ms-01');
    const slider = page.getByLabel(/FONT SCALE/);
    await slider.fill('1.3');
    const scale = await page
      .locator('[style*="--essay-font-scale"]')
      .first()
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--essay-font-scale').trim());
    expect(scale).toBe('1.3');
  });
});
