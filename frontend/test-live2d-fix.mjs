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

  console.log('Waiting 6 seconds for page to fully load...');
  await page.waitForTimeout(6000);

  // Filter for Live2D debug messages
  const live2dMessages = consoleMessages.filter(
    m => /\[Live2D\]|\[SHARED|SHARED|\[APP TICKER\]|DEBUG/.test(m.text)
  );

  console.log('\n=== Live2D Debug Messages ===');
  live2dMessages.forEach(m => console.log(`  [${m.type}] ${m.text}`));

  // Check for errors
  const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
  if (errors.length > 0) {
    console.log('\n=== Errors ===');
    errors.forEach(m => console.log(`  [${m.type}] ${m.text}`));
  }

  // Check pixel values
  const pixelResult = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'no canvas found';
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 'no gl context';
    const px = new Uint8Array(4);
    gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return `center pixel=[${px.join(',')}] canvas=${canvas.width}x${canvas.height}`;
  });
  console.log(`\n=== Pixel Check ===\n  ${pixelResult}`);

  await page.screenshot({ path: 'D:\wakeup_demo\frontend\live2d-fix-screenshot.png', fullPage: true });
  console.log('\nScreenshot saved to live2d-fix-screenshot.png');

  await browser.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
