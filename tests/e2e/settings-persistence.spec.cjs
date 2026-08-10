const { test, expect } = require('@playwright/test');
const { openFreshGame } = require('./helpers.cjs');

test.describe('Settings Persistence', function () {
  test.beforeEach(async function ({ page }) {
    await openFreshGame(page);
  });

  async function openSettings(page) {
    await page.locator('.title-settings-btn[title="设置"]').click();
    await expect(page.locator('.modal-backdrop')).toBeVisible();
  }

  test('settings modal opens from title screen', async function ({ page }) {
    await openSettings(page);
    await expect(page.locator('.settings-slider').first()).toBeVisible();
  });

  test('page scale slider changes document zoom', async function ({ page }) {
    await openSettings(page);
    var slider = page.locator('input.settings-slider[type="range"][min="100"][max="140"]');
    await expect(slider).toBeVisible();
    var beforeZoom = await page.evaluate(function () { return document.documentElement.style.zoom; });
    await slider.fill('140');
    var afterZoom = await page.evaluate(function () { return document.documentElement.style.zoom; });
    expect(afterZoom).not.toEqual(beforeZoom);
  });

  test('settings modal closes on close button click', async function ({ page }) {
    await openSettings(page);
    await page.locator('.modal-close').click();
    await expect(page.locator('.modal-backdrop')).toBeHidden();
  });
});
