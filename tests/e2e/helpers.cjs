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

async function dispatchGameAction(page, action) {
  await page.evaluate(async function (nextAction) {
    var storeModule = await import('/src/state/useGameStore.js');
    storeModule.useGameStore.getState().dispatch(nextAction);
  }, action);
}

async function navigateToGame(page) {
  await dispatchGameAction(page, { type: 'START_GAME' });
  await dispatchGameAction(page, { type: 'SKIP_PROLOGUE' });
  await dispatchGameAction(page, { type: 'DISMISS_GUIDE' });
  await dispatchGameAction(page, { type: 'ROLL_STATS' });
  await dispatchGameAction(page, { type: 'BEGIN_ADVENTURE' });
  await expect(page.locator('.game-root')).toBeVisible({ timeout: 10000 });
}

module.exports = {
  dispatchGameAction,
  navigateToGame,
  openFreshGame,
};
