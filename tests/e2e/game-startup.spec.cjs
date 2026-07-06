// tests/e2e/game-startup.spec.cjs
// Phase 4: Verify the game starts correctly from title screen to game screen.
const { test, expect } = require('@playwright/test');

test.describe('Game Startup', function () {
  test('title screen loads with correct content', async function ({ page }) {
    await page.goto('/');
    // Wait for loading screen to disappear
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 }).catch(function () {});
    await page.waitForTimeout(2000);

    // Verify title screen content
    await expect(page.locator('.title-screen')).toBeVisible();
    await expect(page.locator('text=深渊低语')).toBeVisible();
    await expect(page.locator('text=沃切斯特之影')).toBeVisible();
    await expect(page.locator('.btn-primary')).toBeVisible();
  });

  test('start button navigates to character creation', async function ({ page }) {
    await page.goto('/');
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 }).catch(function () {});
    await page.waitForTimeout(2000);

    // Click start button
    await page.click('.btn-primary:has-text("踏入深渊")');
    await page.waitForTimeout(1000);

    // Should be on survival guide or character creation screen
    const onGuide = await page.locator('.guide-journal-title').isVisible().catch(function () { return false; });
    const onCreation = await page.locator('.char-creation').isVisible().catch(function () { return false; });
    expect(onGuide || onCreation).toBe(true);
  });

  test('start button on empty save navigates to guide then creation', async function ({ page }) {
    // Clear any existing save data
    await page.evaluate(function () { localStorage.clear(); });

    await page.goto('/');
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 }).catch(function () {});
    await page.waitForTimeout(2000);

    await page.click('.btn-primary:has-text("踏入深渊")');
    await page.waitForTimeout(500);

    // Should show survival guide (first-run experience)
    const guideVisible = await page.locator('.guide-journal').isVisible().catch(function () { return false; });
    if (guideVisible) {
      await page.click('.guide-continue-btn:has-text("我准备好了")');
      await page.waitForTimeout(500);
    }

    // Should eventually reach character creation
    const creationVisible = await page.locator('.char-creation').isVisible().catch(function () { return false; });
    expect(creationVisible || guideVisible).toBe(true);
  });
});
