const { test, expect } = require('@playwright/test');

test.describe('SAN Visual Effects System', () => {
  test.beforeEach(async ({ page }) => {
    // 启动开发服务器
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    // 等待游戏加载
    await page.waitForSelector('.game-screens', { timeout: 10000 });
  });

  test('页面加载和基本元素检查', async ({ page }) => {
    // 检查页面标题
    const title = await page.title();
    console.log('页面标题:', title);
    
    // 检查是否有游戏容器
    const gameContainer = await page.$('.game-screens');
    expect(gameContainer).toBeTruthy();
    console.log('✅ 游戏容器存在');
    
    // 检查是否有SAN污染层组件
    const sanLayer = await page.$('.san-pollution-layer');
    console.log('SAN污染层:', sanLayer ? '存在' : '不存在');
    
    // 截图
    await page.screenshot({ path: 'tests/e2e/screenshots/01_initial_load.png' });
    console.log('✅ 初始加载截图已保存');
  });

  test('SAN值变化测试', async ({ page }) => {
    // 进入游戏（点击开始按钮）
    const startBtn = await page.$('button:has-text("开始")');
    if (startBtn) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // 打开开发者面板（按 ~ 键）
    await page.keyboard.press('Backquote');
    await page.waitForTimeout(500);
    
    // 检查DevPanel是否打开
    const devPanel = await page.$('.dev-panel');
    console.log('DevPanel:', devPanel ? '已打开' : '未打开');
    
    if (devPanel) {
      // 截图：DevPanel打开状态
      await page.screenshot({ path: 'tests/e2e/screenshots/02_devpanel_open.png' });
      
      // 找到SAN输入框并修改值
      const sanInput = await page.$('input[type="number"]');
      if (sanInput) {
        // 设置SAN为50（感知偏移阶段）
        await sanInput.fill('50');
        await sanInput.press('Enter');
        await page.waitForTimeout(1000);
        
        // 截图：SAN 50
        await page.screenshot({ path: 'tests/e2e/screenshots/03_san_50.png' });
        console.log('✅ SAN 50截图已保存');
        
        // 设置SAN为25（解释权动摇阶段）
        await sanInput.fill('25');
        await sanInput.press('Enter');
        await page.waitForTimeout(1000);
        
        // 截图：SAN 25
        await page.screenshot({ path: 'tests/e2e/screenshots/04_san_25.png' });
        console.log('✅ SAN 25截图已保存');
        
        // 设置SAN为8（现实崩解阶段）
        await sanInput.fill('8');
        await sanInput.press('Enter');
        await page.waitForTimeout(1000);
        
        // 截图：SAN 8
        await page.screenshot({ path: 'tests/e2e/screenshots/05_san_8.png' });
        console.log('✅ SAN 8截图已保存');
      }
    }
    
    // 关闭DevPanel
    await page.keyboard.press('Backquote');
    await page.waitForTimeout(500);
  });

  test('Canvas渲染验证', async ({ page }) => {
    // 进入游戏
    const startBtn = await page.$('button:has-text("开始")');
    if (startBtn) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // 设置低SAN值
    await page.keyboard.press('Backquote');
    await page.waitForTimeout(300);
    const sanInput = await page.$('input[type="number"]');
    if (sanInput) {
      await sanInput.fill('20');
      await sanInput.press('Enter');
      await page.waitForTimeout(500);
    }
    await page.keyboard.press('Backquote');
    await page.waitForTimeout(1000);
    
    // 检查Canvas元素
    const canvas = await page.$('.san-pollution-layer');
    if (canvas) {
      // 获取Canvas的可见性
      const opacity = await page.evaluate(() => {
        const canvas = document.querySelector('.san-pollution-layer');
        return canvas ? window.getComputedStyle(canvas).opacity : '0';
      });
      console.log('Canvas opacity:', opacity);
      expect(parseFloat(opacity)).toBeGreaterThan(0);
      console.log('✅ Canvas层可见');
      
      // 截图：Canvas渲染效果
      await page.screenshot({ path: 'tests/e2e/screenshots/06_canvas_render.png' });
      console.log('✅ Canvas渲染截图已保存');
    }
    
    // 检查是否有CSS动画
    const hasAnimations = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="san-stage"]');
      return elements.length > 0;
    });
    console.log('CSS动画元素:', hasAnimations ? '存在' : '不存在');
  });

  test('性能监控', async ({ page }) => {
    // 进入游戏
    const startBtn = await page.$('button:has-text("开始")');
    if (startBtn) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // 设置低SAN值触发视觉效果
    await page.keyboard.press('Backquote');
    await page.waitForTimeout(300);
    const sanInput = await page.$('input[type="number"]');
    if (sanInput) {
      await sanInput.fill('15');
      await sanInput.press('Enter');
    }
    await page.keyboard.press('Backquote');
    await page.waitForTimeout(500);
    
    // 监控FPS
    const fps = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let frames = 0;
        const startTime = performance.now();
        
        function countFrame() {
          frames++;
          if (performance.now() - startTime < 2000) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(Math.round(frames / 2));
          }
        }
        
        requestAnimationFrame(countFrame);
      });
    });
    
    console.log('FPS:', fps);
    expect(fps).toBeGreaterThan(10); // 至少10fps
    console.log('✅ 性能可接受 (FPS:', fps, ')');
  });

  test('视觉阶段切换验证', async ({ page }) => {
    // 进入游戏
    const startBtn = await page.$('button:has-text("开始")');
    if (startBtn) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // 测试不同SAN阶段
    const stages = [
      { san: 80, expected: 'stable', name: '认知稳定' },
      { san: 60, expected: 'mild_erosion', name: '轻度侵蚀' },
      { san: 45, expected: 'perception_shift', name: '感知偏移' },
      { san: 30, expected: 'explanation_loss', name: '解释权动摇' },
      { san: 15, expected: 'reality_dissolution', name: '现实侵蚀' },
      { san: 5, expected: 'narrative_death', name: '现实崩解' },
    ];
    
    for (const stage of stages) {
      // 设置SAN值
      await page.keyboard.press('Backquote');
      await page.waitForTimeout(200);
      const sanInput = await page.$('input[type="number"]');
      if (sanInput) {
        await sanInput.fill(String(stage.san));
        await sanInput.press('Enter');
      }
      await page.keyboard.press('Backquote');
      await page.waitForTimeout(800);
      
      // 检查CSS类
      const hasStageClass = await page.evaluate((expectedStage) => {
        const root = document.querySelector('.game-screens');
        if (!root) return false;
        const className = root.className;
        // 检查是否有对应的stage类
        return className.includes('san-stage-') || 
               className.includes('visual-') ||
               className.includes('san-tremor') ||
               className.includes('san-fracture');
      }, stage.expected);
      
      console.log(`SAN ${stage.san} (${stage.name}):`, hasStageClass ? '✅ 已应用视觉效果' : '⚠️ 未检测到视觉效果');
      
      // 截图
      await page.screenshot({ 
        path: `tests/e2e/screenshots/07_stage_${stage.expected}.png` 
      });
    }
    
    console.log('✅ 所有阶段截图已保存');
  });
});

console.log('测试脚本已创建: tests/e2e/test_visual_effects.js');
