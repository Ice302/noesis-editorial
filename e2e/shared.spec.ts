import { expect, test, type Browser, type Page } from '@playwright/test';
import { openStudio } from './helpers.ts';
import { EDITORS } from './constants.ts';

// These tests share one server-side database, so they run in order.
test.describe.configure({ mode: 'serial' });

async function signIn(browser: Browser, editor: (typeof EDITORS)[number], path: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openStudio(page, path);
  await page.getByRole('button', { name: 'SIGN IN →' }).click();
  const dialog = page.getByRole('dialog', { name: 'EDITORIAL ACCESS' });
  await dialog.getByLabel('USERNAME').fill(editor.username);
  await dialog.getByLabel('PASSWORD').fill(editor.password);
  await dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(editor.displayName, { exact: false }).first()).toBeVisible();
  return page;
}

async function edit(page: Page, text: string) {
  await page.locator('#para-0').click();
  await page.keyboard.press('End');
  await page.keyboard.type(text);
}

test('rejects a wrong password with a generic message', async ({ page }) => {
  await openStudio(page, '/essays/ms-02');
  await page.getByRole('button', { name: 'SIGN IN →' }).click();
  const dialog = page.getByRole('dialog', { name: 'EDITORIAL ACCESS' });
  await dialog.getByLabel('USERNAME').fill('e2e-a');
  await dialog.getByLabel('PASSWORD').fill('not-the-password');
  await dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Invalid username or password.');
});

test('the revisions API requires a session', async ({ request }) => {
  const response = await request.get('/api/essays/ms-02/revisions');
  expect(response.status()).toBe(401);
});

test('revisions are shared between editors, with conflict detection', async ({ browser }) => {
  const a = await signIn(browser, EDITORS[0], '/essays/ms-02?view=editor');
  const panelA = a.getByRole('region', { name: 'Revision History' });
  await expect(panelA.getByText('SHARED', { exact: true })).toBeVisible();

  await edit(a, ' Shared by A.');
  await panelA.getByPlaceholder('Note for this revision…').fill('first shared pass');
  await panelA.getByRole('button', { name: 'COMMIT R1' }).click();
  await expect(
    a.getByRole('status').filter({ hasText: 'Committed R1 to the shared archive.' })
  ).toBeVisible();

  // Editor B sees A's revision.
  const b = await signIn(browser, EDITORS[1], '/essays/ms-02?view=editor');
  const panelB = b.getByRole('region', { name: 'Revision History' });
  await expect(panelB.getByText('first shared pass')).toBeVisible();
  await expect(panelB.getByText('Editor A')).toBeVisible();
  await expect(b.locator('#para-0')).toContainText('Shared by A.');

  // Both draft on top of R1; A commits first, so B's commit conflicts.
  await edit(a, ' Second by A.');
  await edit(b, ' Competing by B.');
  await panelA.getByRole('button', { name: 'COMMIT R2' }).click();
  await expect(panelA.getByText('R2', { exact: true })).toBeVisible();

  await panelB.getByRole('button', { name: 'COMMIT R2' }).click();
  await expect(panelB.getByRole('alert')).toContainText('committed R2 first');
  await expect(b.locator('#para-0')).toContainText('Competing by B.'); // draft kept

  // B can now commit on top of A's R2.
  await panelB.getByRole('button', { name: 'COMMIT R3' }).click();
  await expect(panelB.getByText('R3', { exact: true })).toBeVisible();

  // Signing out returns to local mode.
  await b.getByRole('button', { name: 'SIGN OUT' }).click();
  await expect(panelB.getByText('LOCAL', { exact: true })).toBeVisible();

  await a.context().close();
  await b.context().close();
});
