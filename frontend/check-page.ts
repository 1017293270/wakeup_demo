import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages: { type: string; text: string }[] = [];
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // Collect page errors
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  console.log('Navigating to http://localhost:5178...');
  await page.goto('http://localhost:5178', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait 10 seconds for full load
  console.log('Waiting 10 seconds for full load...');
  await page.waitForTimeout(10000);

  // Take screenshot
  await page.screenshot({ path: 'D:/wakeup_demo/frontend/screenshot-check.png', fullPage: true });
  console.log('Screenshot saved to D:/wakeup_demo/frontend/screenshot-check.png');

  // Check for Live2D error text
  const bodyText = await page.textContent('body') || '';
  const hasLive2DError = bodyText.includes('Live2D 加载失败');
  console.log('\n=== Live2D Error Check ===');
  console.log(`Contains "Live2D 加载失败": ${hasLive2DError}`);

  // Check page title
  const title = await page.title();
  console.log(`\nPage title: ${title}`);

  // Get current URL
  const url = page.url();
  console.log(`Current URL: ${url}`);

  // Check for any visible error elements
  const errorElements = await page.$$('[class*="error"], [class*="Error"], [class*="fail"], [class*="Fail"]');
  console.log(`\nFound ${errorElements.length} error/fail elements`);
  for (const el of errorElements) {
    const text = await el.textContent();
    if (text && text.trim()) {
      console.log(`  Error element text: ${text.trim().substring(0, 200)}`);
    }
  }

  // Print all console messages
  console.log('\n=== Console Messages ===');
  for (const msg of consoleMessages) {
    console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
  }

  // Print all page errors
  console.log('\n=== Page Errors ===');
  if (pageErrors.length === 0) {
    console.log('No page errors found');
  } else {
    for (const err of pageErrors) {
      console.log(`ERROR: ${err}`);
    }
  }

  // Check if the specific "Cannot read properties of undefined" error exists
  const hasUndefinedError = pageErrors.some(e => e.includes('Cannot read properties of undefined'));
  console.log(`\n=== "Cannot read properties of undefined" Error ===`);
  console.log(`Found: ${hasUndefinedError}`);
  if (hasUndefinedError) {
    for (const err of pageErrors.filter(e => e.includes('Cannot read properties of undefined'))) {
      console.log(`  ${err}`);
    }
  }

  await browser.close();
})();
