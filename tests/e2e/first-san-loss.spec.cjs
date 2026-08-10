const { test, expect } = require('@playwright/test');
const { openFreshGame } = require('./helpers.cjs');

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

    var continueButton = page.locator('.guide-continue-btn');
    await expect(continueButton).toBeVisible({ timeout: 10000 });
    await continueButton.click();
    await expect(page.locator('.char-creation')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '掷骰生成属性' }).click();
    await expect(page.locator('.stat-item')).toHaveCount(8);
    await page.locator('.char-creation .btn-primary').last().click();

    await expect(page.locator('.game-root')).toBeVisible({ timeout: 10000 });
  });

  test('first SAN drain updates state without leaving the game', async function ({ page }) {
    await page.locator('.title-screen .btn-primary').click();
    await expect(page.locator('.prologue-screen')).toBeVisible({ timeout: 5000 });

    // Advance through the first three scenes using real player choices.
    for (var i = 0; i < 3; i++) {
      var previousTitle = await page.locator('.prologue-scene-title').textContent();
      await page.locator('.prologue-choice-btn').first().click();
      await expect.poll(async function () {
        return page.locator('.prologue-scene-title').textContent();
      }).not.toBe(previousTitle);
    }

    await expect(page.locator('.prologue-scene-title')).toContainText('镜中伤口');
    var sanDisplay = page.locator('.prologue-footer-item').filter({ hasText: 'SAN：' });
    var before = Number((await sanDisplay.textContent()).replace(/\D/g, ''));
    await page.locator('.prologue-choice-btn').first().click();
    await expect.poll(async function () {
      return Number((await sanDisplay.textContent()).replace(/\D/g, ''));
    }).toBe(before - 2);
    await expect(page.locator('.prologue-screen')).toBeVisible();
  });
});
