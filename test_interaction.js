const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080');
  await page.waitForTimeout(2000);
  
  // Click on a node (center area likely has one)
  const canvas = await page.locator('#canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2 + 100, box.y + box.height / 2);
  await page.waitForTimeout(1000);
  
  // Take screenshot after click
  await page.screenshot({ path: '/tmp/after-click.png' });
  
  // Double click to enter
  await page.mouse.dblclick(box.x + box.width / 2 + 100, box.y + box.height / 2);
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: '/tmp/after-dblclick.png' });
  
  await browser.close();
})();
