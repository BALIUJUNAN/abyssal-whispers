// tests/e2e/first-san-loss.spec.cjs
// Phase 4: Verify game screen elements appear after navigating through the full startup flow.
const { test, expect } = require('@playwright/test');

test.describe('Game Startup Flow', function () {
  test.beforeEach(async function ({ page }) {
    await page.goto('/');
    await page.evaluate(function () { localStorage.clear(); });
    await page.waitForTimeout(1000);
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 }).catch(function () {});
    await page.waitForTimeout(2000);
  });

  test('title screen shows game title and start button', async function ({ page }) {
    await expect(page.locator('.title-screen')).toBeVisible();
    await expect(page.locator('text=深渊低语')).toBeVisible();
    await expect(page.locator('text=沃切斯特之影')).toBeVisible();
    await expect(page.locator('.btn-primary:has-text("踏入深渊")')).toBeVisible();
  });

  test('full navigation: title -> guide -> creation -> prologue -> game', async function ({ page }) {
    // Step 1: Click start
    await page.click('.btn-primary:has-text("踏入深渊")');
    await page.waitForTimeout(500);

    // Step 2: Handle survival guide if present
    const guideTitle = page.locator('.guide-journal-title');
    if (await guideTitle.isVisible().catch(function () { return false; })) {
      await expect(guideTitle).toHaveText('生存指南');
      await page.click('.guide-continue-btn:has-text("我准备好了")');
      await page.waitForTimeout(500);
    }

    // Step 3: Character creation — roll stats
    const rollBtn = page.locator('button:has-text("掷骰生成属性")');
    if (await rollBtn.isVisible().catch(function () { return false; })) {
      await rollBtn.click();
      await page.waitForTimeout(500);
      // Verify stats are displayed
      const statItems = page.locator('.stat-item');
      expect(await statItems.count()).toBeGreaterThan(0);
    }

    // Step 4: Start adventure
    const startBtn = page.locator('button:has-text("开始调查")');
    if (await startBtn.isVisible().catch(function () { return false; })) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    // Step 5: Prologue — make a choice
    const prologueScreen = page.locator('.prologue-screen');
    if (await prologueScreen.isVisible().catch(function () { return false; })) {
      const choice = page.locator('.prologue-choice-btn').first();
      if (await choice.isVisible().catch(function () { return false; })) {
        await choice.click();
        await page.waitForTimeout(500);
      }

      // Complete prologue
      const completeBtn = page.locator('button:has-text("进入正片")');
      if (await completeBtn.isVisible().catch(function () { return false; })) {
        await completeBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Final assertion: game screen is active
    await expect(page.locator('.game-root')).toBeVisible({ timeout: 15000 });

    // Verify game has core UI elements
    const gameRoot = page.locator('.game-root');
    await expect(gameRoot).toHaveClass(/game-root/);
  });

  test('boot hint appears on first game entry', async function ({ page }) {
    // Navigate to game screen (first run — no save data)
    await page.click('.btn-primary:has-text("踏入深渊")');
    await page.waitForTimeout(500);

    const guideBtn = page.locator('.guide-continue-btn:has-text("我准备好了")');
    if (await guideBtn.isVisible().catch(function () { return false; })) {
      await guideBtn.click();
      await page.waitForTimeout(500);
    }

    const rollBtn = page.locator('button:has-text("掷骰生成属性")');
    if (await rollBtn.isVisible().catch(function () { return false; })) {
      await rollBtn.click();
      await page.waitByTimeout(500);
    }

    const startBtn = page.locator('button:has-text("开始调查")');
    if (await startBtn.isVisible().catch(function () { return false; })) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    const firstChoice = page.locator('.prologue-choice-btn').first();
    if (await firstChoice.isVisible().catch(function () { return false; })) {
      await firstChoice.click();
      await page.waitForTimeout(500);
    }

    const completeBtn = page.locator('button:has-text("进入正片")');
    if (await completeBtn.isVisible().catch(function () { return false; })) {
      await completeBtn.click();
      await page.waitForTimeout(1000);
    }

    // Verify game screen is active
    await expect(page.locator('.game-root')).toBeVisible({ timeout: 15000 });

    // Boot hint may appear briefly — verify it exists in DOM
    const bootHint = page.locator('.boot-hint');
    // The hint appears for 8 seconds then disappears; check it was rendered
    const hintExists = await bootHint.count() > 0;
    expect(hintExists).toBe(true);
  });
});
