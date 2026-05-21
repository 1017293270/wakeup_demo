import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(6000);

  // Show errors
  const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
  if (errors.length > 0) {
    console.log('=== Errors ===');
    errors.slice(0, 10).forEach(m => console.log(`  [${m.type}] ${m.text.substring(0, 200)}`));
  } else {
    console.log('No errors.');
  }

  // Show Live2D messages
  const live2d = consoleMessages.filter(m => /\[Live2D\]|Cubism/i.test(m.text));
  console.log('=== Live2D ===');
  live2d.forEach(m => console.log(`  ${m.text}`));

  await page.screenshot({ path: '/tmp/robot-test.png', fullPage: true });
  console.log('Screenshot: /tmp/robot-test.png');

  await browser.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
