const { test, expect } = require('@playwright/test');
const { navigateToGame, openFreshGame } = require('./helpers.cjs');

test.describe('Save / Load', function () {
  test.beforeEach(async function ({ page }) {
    await openFreshGame(page);
    await navigateToGame(page);
  });

  test('complete game startup reaches the main layout', async function ({ page }) {
    await expect(page.locator('.game-root')).toBeVisible();
    await expect(page.locator('.game-layout.town-map-mode')).toBeVisible();
    await expect(page.locator('.floating-info-bar')).toBeVisible();
  });

  test('game screen displays SAN and HP bars', async function ({ page }) {
    await expect(page.locator('.finfo-bar.san')).toBeVisible();
    await expect(page.locator('.finfo-bar.hp')).toBeVisible();
  });

  test('save-load modal opens from the header', async function ({ page }) {
    var saveButton = page.locator('.floating-info-bar .finfo-btn[title="存档"]');
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await expect(page.locator('.save-slots-grid')).toBeVisible();
    expect(await page.locator('.save-slot').count()).toBeGreaterThan(0);
  });
});
