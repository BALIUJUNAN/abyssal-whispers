const { expect } = require('@playwright/test');

async function openFreshGame(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(function () {
    localStorage.clear();
  });
  await page.goto('/');
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 }).catch(function () {});
  await expect(page.locator('.title-screen')).toBeVisible({ timeout: 30000 });
}

async function navigateToGame(page) {
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
}

module.exports = {
  navigateToGame,
  openFreshGame,
};
