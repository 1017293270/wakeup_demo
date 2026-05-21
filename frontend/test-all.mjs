import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text().substring(0, 300) }));

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  console.log('=== All Console Messages ===');
  consoleMessages.forEach(m => console.log(`  [${m.type}] ${m.text}`));

  await browser.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
