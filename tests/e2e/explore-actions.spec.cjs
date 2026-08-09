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

  test('notebook opens with N without crashing the game', async function ({ page }) {
    await page.keyboard.press('n');
    await expect(page.locator('.notebook-modal')).toBeVisible();
    await expect(page.getByRole('heading', { name: '游戏遇到错误' })).toHaveCount(0);

    await page.locator('.notebook-modal .modal-close').click();
    await expect(page.locator('.notebook-modal')).toBeHidden();

    await page.locator('.notebook-open-map-btn').click();
    await expect(page.locator('.notebook-modal')).toBeVisible();
    await page.locator('.notebook-modal .modal-close').click();
    await expect(page.locator('.game-root')).toBeVisible();
  });

  test('map shortcuts expose clues and usable inventory', async function ({ page }) {
    await expect(page.locator('.boot-hint')).toContainText('N 笔记本');
    await expect(page.locator('.boot-hint')).toContainText('J 线索');
    await expect(page.locator('.boot-hint')).toContainText('I 物品');

    await page.keyboard.press('j');
    await expect(page.locator('.clue-panel-overlay')).toBeVisible();
    await expect(page.getByText(/已知线索/)).toBeVisible();
    await page.keyboard.press('j');
    await expect(page.locator('.clue-panel-overlay')).toBeHidden();

    await page.keyboard.press('i');
    var inventoryPanel = page.locator('.inventory-panel');
    await expect(inventoryPanel).toBeVisible();
    var flashlight = inventoryPanel.locator('.inventory-panel-item').filter({ hasText: '手电筒' });
    await expect(flashlight).toContainText('×10');
    await flashlight.locator('.inventory-use-btn').click();
    await expect(flashlight).toContainText('×9');
    await expect(page.locator('.game-root')).toBeVisible();

    await page.keyboard.press('i');
    await expect(inventoryPanel).toBeHidden();
  });
});
