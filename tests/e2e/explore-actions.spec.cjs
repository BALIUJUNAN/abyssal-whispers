const { test, expect } = require('@playwright/test');
const { navigateToGame, openFreshGame } = require('./helpers.cjs');

async function openCurrentAreaPanel(page) {
  var currentHotspot = page.locator('.town-hotspot.hotspot-current').first();
  await expect(currentHotspot).toBeVisible();
  await currentHotspot.click();
  await expect(page.locator('.area-panel-modal')).toBeVisible();
}

test.describe('Explore Actions', function () {
  test.beforeEach(async function ({ page }) {
    await openFreshGame(page);
    await navigateToGame(page);
    await expect(page.locator('.town-map-container')).toBeVisible({ timeout: 10000 });
  });

  test('map screen loads its background and interactive hotspots', async function ({ page }) {
    expect(await page.locator('.town-hotspot:not([disabled])').count()).toBeGreaterThan(0);
    var background = page.locator('.town-map-bg-image');
    await expect(background).toBeVisible();
    await expect.poll(async function () {
      return background.evaluate(function (img) { return img.naturalWidth; });
    }).toBeGreaterThan(0);
  });

  test('area panel exposes an interactive action', async function ({ page }) {
    await openCurrentAreaPanel(page);
    var firstAction = page.locator('.area-panel-action-btn:not([disabled])').first();
    await expect(firstAction).toBeVisible();
    await firstAction.click();
    await expect(page.locator('.game-root')).toBeVisible();
  });

  test('map AP display survives an action', async function ({ page }) {
    var apDisplay = page.locator('.finfo-bar.ap .finfo-bar-value');
    await expect(apDisplay).toBeVisible();
    var beforeText = await apDisplay.textContent();

    await openCurrentAreaPanel(page);
    var firstAction = page.locator('.area-panel-action-btn:not([disabled])').first();
    await firstAction.click();

    await expect(apDisplay).toBeVisible();
    expect(await apDisplay.textContent()).toBeTruthy();
    expect(beforeText).toBeTruthy();
  });

  test('map narrative panel is mounted and contains content', async function ({ page }) {
    var toggle = page.locator('.narrative-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    var narrativeArea = page.locator('.narrative-floating-content');
    await expect(narrativeArea).toBeVisible();
    expect((await narrativeArea.textContent()).trim().length).toBeGreaterThan(0);
  });
});
