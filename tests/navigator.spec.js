import { test, expect } from '@playwright/test';

test.describe('Jurassic UNIX Navigator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/Jurassic UNIX Navigator/);
    
    // Check that header elements are present
    await expect(page.locator('#header-left')).toHaveText('FSN / Jurassic Mode');
    await expect(page.locator('#header-right')).toHaveText("IT'S A UNIX SYSTEM");
  });

  test('should display HUD with path and help text', async ({ page }) => {
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
    
    const hudText = await hud.textContent();
    expect(hudText).toContain('home/user');
    expect(hudText).toContain('Drag=rotate');
  });

  test('should render canvas', async ({ page }) => {
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
    
    // Check canvas has proper dimensions
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('should show hint on hover', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const hint = page.locator('#hint');
    
    // Initially hint should be empty
    await expect(hint).toHaveText('');
    
    // Hover over canvas center (likely to have a node)
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    
    // Wait a bit for hover to register
    await page.waitForTimeout(100);
    
    // Hint might have content now (if we're hovering over a node)
    // This is conditional based on node positions
  });

  test('should handle keyboard navigation - go up', async ({ page }) => {
    const hud = page.locator('#hud');
    
    // Get initial path
    const initialText = await hud.textContent();
    expect(initialText).toContain('home/user');
    
    // Press Backspace to go up
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);
    
    // Path should change to parent directory
    const newText = await hud.textContent();
    expect(newText).toContain('/home');
    expect(newText).not.toContain('home/user');
  });

  test('should handle zoom in with plus key', async ({ page }) => {
    // Just verify the key press doesn't cause errors
    await page.keyboard.press('+');
    await page.waitForTimeout(50);
    
    // Application should still be responsive
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle zoom out with minus key', async ({ page }) => {
    await page.keyboard.press('-');
    await page.waitForTimeout(50);
    
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle mouse drag for rotation', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    
    // Simulate drag
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 50);
    await page.mouse.up();
    
    // Application should still be responsive
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle mouse wheel for zoom', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    
    // Scroll to zoom
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100);
    
    await page.waitForTimeout(50);
    
    // Application should still be responsive
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should navigate into directory on click', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const hud = page.locator('#hud');
    const box = await canvas.boundingBox();
    
    // Click in center (likely to have a node)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    
    await page.waitForTimeout(100);
    
    // Application should still be responsive
    await expect(hud).toBeVisible();
  });

  test('should display correct colors', async ({ page }) => {
    // Check that body has black background
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(bodyBg).toBe('rgb(0, 0, 0)');
    
    // Check header color
    const headerColor = await page.evaluate(() => {
      return window.getComputedStyle(document.getElementById('header-left')).color;
    });
    expect(headerColor).toBe('rgb(119, 225, 255)'); // #77e1ff
  });
});
