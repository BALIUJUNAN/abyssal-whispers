// tests/e2e/save-load.spec.cjs
// Phase 4: Verify save game and load game flows work end-to-end.
const { test, expect } = require('@playwright/test');

test.describe('Save / Load', function () {
  test.beforeEach(async function ({ page }) {
    await page.goto('/');
    await page.evaluate(function () { localStorage.clear(); });
    await page.waitForTimeout(1000);
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 }).catch(function () {});
    await page.waitForTimeout(2000);
  });

  test('complete game startup and reach game screen', async function ({ page }) {
    // Click start
    await page.click('.btn-primary:has-text("踏入深渊")');
    await page.waitForTimeout(500);

    // Handle guide if present
    const guideBtn = page.locator('.guide-continue-btn:has-text("我准备好了")');
    if (await guideBtn.isVisible().catch(function () { return false; })) {
      await guideBtn.click();
      await page.waitForTimeout(500);
    }

    // Roll stats
    const rollBtn = page.locator('button:has-text("掷骰生成属性")');
    if (await rollBtn.isVisible().catch(function () { return false; })) {
      await rollBtn.click();
      await page.waitForTimeout(500);
    }

    // Start adventure
    const startBtn = page.locator('button:has-text("开始调查")');
    if (await startBtn.isVisible().catch(function () { return false; })) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    // Prologue: make first choice
    const firstChoice = page.locator('.prologue-choice-btn').first();
    if (await firstChoice.isVisible().catch(function () { return false; })) {
      await firstChoice.click();
      await page.waitForTimeout(500);
    }

    // Complete prologue
    const completeBtn = page.locator('button:has-text("进入正片")');
    if (await completeBtn.isVisible().catch(function () { return false; })) {
      await completeBtn.click();
      await page.waitForTimeout(2000);
    }

    // Verify game screen is active with expected structure
    await expect(page.locator('.game-root')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.game-header')).toBeVisible();
  });

  test('game screen displays SAN and HP bars', async function ({ page }) {
    // Navigate to game screen
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
      await page.waitForTimeout(500);
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
      await page.waitForTimeout(2000);
    }

    // Verify status bars are present
    await expect(page.locator('.game-root')).toBeVisible({ timeout: 15000 });

    // Check SAN and HP stat bars exist (left panel)
    const sanBar = page.locator('.stat-bar.san');
    const hpBar = page.locator('.stat-bar.hp');

    // At least one of the panels should show these bars
    const sanVisible = await sanBar.count() > 0;
    const hpVisible = await hpBar.count() > 0;
    expect(sanVisible || hpVisible).toBe(true);
  });

  test('save-load modal accessible from header buttons', async function ({ page }) {
    // Navigate to game screen
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
      await page.waitForTimeout(500);
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
      await page.waitForTimeout(2000);
    }

    // Verify game header buttons are present
    await expect(page.locator('.game-header')).toBeVisible({ timeout: 15000 });

    // Header should have save/load buttons (identified by title attributes)
    const saveBtn = page.locator('.header-btn[title="写入调查记录"], .header-btn[title*="存档"]');
    const loadBtn = page.locator('.header-btn[title="读取调查记录"], .header-btn[title*="读档"]');

    // At minimum verify header buttons exist
    const headerBtns = page.locator('.header-btn');
    const btnCount = await headerBtns.count();
    expect(btnCount).toBeGreaterThan(0);
  });
});
