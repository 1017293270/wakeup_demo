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

  console.log('Waiting 5 seconds for page to fully load...');
  await page.waitForTimeout(5000);

  // Show all console messages
  const live2d = consoleMessages.filter(m => /\[Live2D\]|Live2D|cubism/i.test(m.text));
  console.log('\n=== Live2D Messages ===');
  live2d.forEach(m => console.log(`  [${m.type}] ${m.text.substring(0, 300)}`));

  // Show errors
  const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
  if (errors.length > 0) {
    console.log('\n=== Errors ===');
    errors.slice(0, 10).forEach(m => console.log(`  [${m.type}] ${m.text.substring(0, 300)}`));
  }

  // Pixel check from within page context
  const pixelInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'no canvas';
    try {
      const gl = canvas.getContext('webgl2');
      if (!gl) return 'no webgl2';
      const px = new Uint8Array(4);
      gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return `center=[${px.join(',')}] canvas=${canvas.width}x${canvas.height}`;
    } catch (e) {
      return `error: ${e.message}`;
    }
  });
  console.log(`\n=== Pixel Check ===\n  ${pixelInfo}`);

  await page.screenshot({ path: '/tmp/live2d-v3.png', fullPage: true });
  console.log('\nScreenshot saved to /tmp/live2d-v3.png');

  await browser.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
