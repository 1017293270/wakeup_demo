import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    consoleMessages.push({ type: 'pageerror', text: err.message });
  });

  console.log('Navigating to http://localhost:5174 ...');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Waiting 8 seconds for page to fully load...');
  await page.waitForTimeout(8000);

  // Show all Live2D messages
  const live2d = consoleMessages.filter(m => /\[Live2D\]/.test(m.text));
  console.log('\n=== Live2D Messages ===');
  live2d.forEach(m => console.log(`  [${m.type}] ${m.text}`));

  // Show errors
  const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
  if (errors.length > 0) {
    console.log('\n=== Errors ===');
    errors.slice(0, 20).forEach(m => console.log(`  [${m.type}] ${m.text.substring(0, 200)}`));
  }

  // Show warnings
  const warnings = consoleMessages.filter(m => m.type === 'warning');
  if (warnings.length > 0) {
    console.log('\n=== Warnings ===');
    warnings.slice(0, 10).forEach(m => console.log(`  ${m.text.substring(0, 200)}`));
  }

  await page.screenshot({ path: '/tmp/live2d-test.png', fullPage: true });
  console.log('\nScreenshot saved to /tmp/live2d-test.png');

  await browser.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
