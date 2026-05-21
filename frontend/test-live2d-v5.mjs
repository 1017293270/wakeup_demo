import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: false });
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

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(8000);

  // Show Live2D messages
  const live2d = consoleMessages.filter(m => /\[Live2D\]/.test(m.text));
  console.log('=== Live2D Messages ===');
  live2d.forEach(m => console.log(`  [${m.type}] ${m.text.substring(0, 300)}`));

  // Show errors
  const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
  if (errors.length > 0) {
    console.log('\n=== Errors ===');
    errors.slice(0, 10).forEach(m => console.log(`  [${m.type}] ${m.text.substring(0, 300)}`));
  }

  // Canvas info
  const info = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { found: false };
    const ctx = canvas.getContext('webgl') || canvas.getContext('webgl2');
    return {
      found: true,
      width: canvas.width, height: canvas.height,
      clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight,
      hasGL: !!ctx,
      ctxLost: ctx?.isContextLost?.() ?? false,
    };
  });
  console.log('\n=== Canvas ===\n', JSON.stringify(info, null, 2));

  await browser.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
