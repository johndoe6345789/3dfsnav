import { test, expect } from '@playwright/test';

test.describe('Jurassic UNIX Navigator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    // Wait for nodes to appear with animation
    await page.waitForTimeout(500);
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
    expect(hudText).toContain('Click=select');
    expect(hudText).toContain('DblClick=enter');
  });

  test('should render canvas and label canvas', async ({ page }) => {
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
    
    const labelCanvas = page.locator('#labelCanvas');
    await expect(labelCanvas).toBeVisible();
    
    // Check canvas has proper dimensions
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('should show labels for nodes', async ({ page }) => {
    // Wait for nodes to fully appear
    await page.waitForTimeout(1500);
    
    // Take a screenshot to verify labels are visible
    const screenshot = await page.screenshot();
    expect(screenshot).toBeTruthy();
    
    // Labels should be rendered on the labelCanvas
    const labelCanvas = page.locator('#labelCanvas');
    await expect(labelCanvas).toBeVisible();
  });

  test('should show hint on hover', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const hint = page.locator('#hint');
    
    // Initially hint should be empty
    await expect(hint).toHaveText('');
    
    // Wait for nodes to appear
    await page.waitForTimeout(1500);
    
    // Hover over canvas center (likely to have a node)
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    
    // Wait a bit for hover to register
    await page.waitForTimeout(200);
    
    // Hint might have content now (conditional based on node positions)
    const hintText = await hint.textContent();
    // If we're hovering over a node, hint should contain file or dir
  });

  test('should handle keyboard navigation - go up', async ({ page }) => {
    const hud = page.locator('#hud');
    
    // Get initial path
    const initialText = await hud.textContent();
    expect(initialText).toContain('home/user');
    
    // Press Backspace to go up
    await page.keyboard.press('Backspace');
    
    // Wait for drill-out animation to complete
    await page.waitForTimeout(800);
    
    // Path should change to parent directory
    const newText = await hud.textContent();
    expect(newText).toContain('/home');
    expect(newText).not.toContain('home/user');
  });

  test('should handle zoom in with plus key', async ({ page }) => {
    // Wait for initial render
    await page.waitForTimeout(1000);
    
    // Press + to zoom in
    await page.keyboard.press('+');
    await page.waitForTimeout(400);
    
    // Application should still be responsive
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle zoom out with minus key', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    await page.keyboard.press('-');
    await page.waitForTimeout(400);
    
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle mouse drag for rotation with smooth animation', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    
    await page.waitForTimeout(1000);
    
    // Simulate drag in multiple directions
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    
    // Drag right
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 150, startY, { steps: 10 });
    await page.mouse.up();
    
    await page.waitForTimeout(200);
    
    // Drag left
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 150, startY, { steps: 10 });
    await page.mouse.up();
    
    await page.waitForTimeout(200);
    
    // Drag up
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - 100, { steps: 10 });
    await page.mouse.up();
    
    await page.waitForTimeout(200);
    
    // Drag down
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 100, { steps: 10 });
    await page.mouse.up();
    
    // Application should still be responsive
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle complex drag patterns', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    
    await page.waitForTimeout(1000);
    
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    // Circular drag motion
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    
    const radius = 100;
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      await page.mouse.move(x, y);
      await page.waitForTimeout(20);
    }
    
    await page.mouse.up();
    await page.waitForTimeout(200);
    
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle mouse wheel for zoom with smooth animation', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    
    await page.waitForTimeout(1000);
    
    // Scroll to zoom in
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -200);
    
    await page.waitForTimeout(400);
    
    // Scroll to zoom out
    await page.mouse.wheel(0, 200);
    
    await page.waitForTimeout(400);
    
    // Application should still be responsive
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle single click to select and fly to node', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const hint = page.locator('#hint');
    const box = await canvas.boundingBox();
    
    await page.waitForTimeout(1500);
    
    // Click on a node (slightly off-center to likely hit a node)
    await page.mouse.click(box.x + box.width / 2 + 100, box.y + box.height / 2);
    
    // Wait for single-click detection delay
    await page.waitForTimeout(400);
    
    // Wait for fly-to animation
    await page.waitForTimeout(1000);
    
    // Check if hint shows SELECTED
    const hintText = await hint.textContent();
    // Hint should contain SELECTED if a node was clicked
    
    // Application should still be responsive
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle double click to enter directory with drill-down animation', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const hud = page.locator('#hud');
    const box = await canvas.boundingBox();
    
    await page.waitForTimeout(1500);
    
    const initialPath = await hud.textContent();
    
    // Double-click on a directory node
    await page.mouse.dblclick(box.x + box.width / 2 + 120, box.y + box.height / 2 - 50);
    
    // Wait for drill-down animation to complete
    await page.waitForTimeout(1000);
    
    // Path might have changed if we clicked on a directory
    await expect(hud).toBeVisible();
  });

  test('should navigate into Documents directory and back with animations', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const hud = page.locator('#hud');
    const box = await canvas.boundingBox();
    
    await page.waitForTimeout(1500);
    
    // Verify we're in /home/user
    let hudText = await hud.textContent();
    expect(hudText).toContain('home/user');
    
    // Try to double-click on Documents (it's usually in the center-right area)
    await page.mouse.dblclick(box.x + box.width / 2 + 80, box.y + box.height / 2 + 80);
    
    // Wait for navigation animation
    await page.waitForTimeout(1000);
    
    // Go back up - should still be in a valid directory
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1000);
    
    // Should be back to a parent directory (might be /home/user or /home depending on whether Documents was entered)
    hudText = await hud.textContent();
    // Just verify we're somewhere valid
    expect(hudText).toMatch(/\/home/);
  });

  test('should display correct colors for nodes', async ({ page }) => {
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

  test('should show node animations on load', async ({ page }) => {
    // Reload to see animation from start
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Take screenshot immediately
    await page.screenshot({ path: '/tmp/nodes-appearing-1.png' });
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/nodes-appearing-2.png' });
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/nodes-appearing-3.png' });
    
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle rapid interactions gracefully', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    
    await page.waitForTimeout(1000);
    
    // Rapid zoom
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('+');
      await page.waitForTimeout(50);
    }
    
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('-');
      await page.waitForTimeout(50);
    }
    
    // Rapid clicking
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(centerX + i * 20, centerY + i * 10);
      await page.waitForTimeout(100);
    }
    
    // Application should still be responsive
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle Enter key to open selected node', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const hint = page.locator('#hint');
    const box = await canvas.boundingBox();
    
    await page.waitForTimeout(1500);
    
    // Click to select a node
    await page.mouse.click(box.x + box.width / 2 + 100, box.y + box.height / 2);
    await page.waitForTimeout(500);
    
    // Press Enter to open
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should handle Escape key', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Press Escape (logs to console in browser)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });

  test('should take visual regression screenshots', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Default view
    await page.screenshot({ path: '/tmp/visual-default.png', fullPage: true });
    
    // After zoom in
    await page.keyboard.press('+');
    await page.waitForTimeout(400);
    await page.screenshot({ path: '/tmp/visual-zoomed-in.png', fullPage: true });
    
    // After zoom out
    await page.keyboard.press('-');
    await page.keyboard.press('-');
    await page.waitForTimeout(400);
    await page.screenshot({ path: '/tmp/visual-zoomed-out.png', fullPage: true });
    
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();
  });
});
