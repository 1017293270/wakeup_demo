import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Waiting 5 seconds for page to fully load...');
  await page.waitForTimeout(5000);

  // Filter for Live2D-related errors
  const live2dErrors = consoleErrors.filter(
    e => /createModel|Live2D|Cubism|null/i.test(e)
  );

  console.log('\n=== All Console Errors ===');
  if (consoleErrors.length === 0) {
    console.log('  (none)');
  } else {
    consoleErrors.forEach(e => console.log('  ' + e));
  }

  console.log('\n=== Live2D-Related Errors ===');
  if (live2dErrors.length === 0) {
    console.log('  (none found matching createModel, Live2D, Cubism, or null)');
  } else {
    live2dErrors.forEach(e => console.log('  ' + e));
  }

  // Check if any Live2D canvas or element exists
  const canvasCount = await page.locator('canvas').count();
  const live2dElements = await page.locator('[class*="live2d" i], [class*="Live2D" i], [class*="cubism" i], [id*="live2d" i], [id*="cubism" i]').count();

  console.log('\n=== Page Element Check ===');
  console.log(`  Canvas elements found: ${canvasCount}`);
  console.log(`  Live2D/Cubism class/id elements: ${live2dElements}`);

  // Check page body text for loading/error indicators
  const bodyText = await page.locator('body').textContent();
  if (bodyText && /loading|error|failed|cannot|exception/i.test(bodyText)) {
    console.log('\n=== Body text contains error/loading keywords ===');
    const lines = bodyText.split('\n').filter(l => /loading|error|failed|cannot|exception/i.test(l.trim()));
    lines.slice(0, 10).forEach(l => console.log(`  "${l.trim()}"`));
  }

  // Take screenshot
  await page.screenshot({ path: 'D:\\wakeup_demo\\frontend\\live2d-check-screenshot.png', fullPage: true });
  console.log('\nScreenshot saved to D:\\wakeup_demo\\frontend\\live2d-check-screenshot.png');

  await browser.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
