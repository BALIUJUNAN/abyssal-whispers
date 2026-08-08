const { test, expect } = require('@playwright/test');
const {
  dispatchGameAction,
  navigateToGame,
  openFreshGame,
} = require('./helpers.cjs');

test.describe('Game Startup Flow', function () {
  test.beforeEach(async function ({ page }) {
    await openFreshGame(page);
  });

  test('title screen shows game title and start button', async function ({ page }) {
    await expect(page.locator('.title-screen h1')).toContainText('深渊低语');
    await expect(page.locator('.title-screen .btn-primary')).toBeVisible();
  });

  test('full navigation reaches the game screen', async function ({ page }) {
    await page.locator('.title-screen .btn-primary').click();
    await expect(page.locator('.prologue-screen')).toBeVisible({ timeout: 5000 });

    page.once('dialog', function (dialog) { return dialog.accept(); });
    await page.locator('.prologue-skip button').click();
    await expect(page.locator('.guide-journal')).toBeVisible({ timeout: 5000 });

    await dispatchGameAction(page, { type: 'DISMISS_GUIDE' });
    await expect(page.locator('.char-creation')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '掷骰生成属性' }).click();
    await expect(page.locator('.stat-item')).toHaveCount(8);
    await page.locator('.char-creation .btn-primary').last().click();

    await expect(page.locator('.game-root')).toBeVisible({ timeout: 10000 });
  });

  test('first SAN drain updates state without leaving the game', async function ({ page }) {
    await navigateToGame(page);
    var before = await page.evaluate(async function () {
      var storeModule = await import('/src/state/useGameStore.js');
      return storeModule.useGameStore.getState().san;
    });

    await dispatchGameAction(page, { type: 'RESIST_SAN_DRAIN', amount: 1 });

    var after = await page.evaluate(async function () {
      var storeModule = await import('/src/state/useGameStore.js');
      return storeModule.useGameStore.getState().san;
    });
    expect(after).toBe(before - 1);
    await expect(page.locator('.game-root')).toBeVisible();
  });
});
