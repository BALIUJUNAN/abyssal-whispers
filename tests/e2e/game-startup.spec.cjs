const { test, expect } = require('@playwright/test');
const { dispatchGameAction, openFreshGame } = require('./helpers.cjs');

test.describe('Game Startup', function () {
  test.beforeEach(async function ({ page }) {
    await openFreshGame(page);
  });

  test('title screen loads with correct content', async function ({ page }) {
    await expect(page.locator('.title-screen h1')).toContainText('深渊低语');
    await expect(page.locator('.title-screen h2')).toContainText('沃切斯特之影');
    await expect(page.locator('.title-screen .btn-primary')).toBeVisible();
  });

  test('start button navigates to the prologue', async function ({ page }) {
    await page.locator('.title-screen .btn-primary').click();
    await expect(page.locator('.prologue-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.prologue-choice-btn').first()).toBeVisible();
  });

  test('skipping the prologue reaches guide then character creation', async function ({ page }) {
    await page.locator('.title-screen .btn-primary').click();
    await expect(page.locator('.prologue-screen')).toBeVisible({ timeout: 5000 });

    page.once('dialog', function (dialog) { return dialog.accept(); });
    await page.locator('.prologue-skip button').click();
    await expect(page.locator('.guide-journal')).toBeVisible({ timeout: 5000 });

    // The guide's reveal animation is covered separately; dispatch its normal
    // reducer action here so this navigation test remains fast and deterministic.
    await dispatchGameAction(page, { type: 'DISMISS_GUIDE' });
    await expect(page.locator('.char-creation')).toBeVisible({ timeout: 5000 });
  });
});
