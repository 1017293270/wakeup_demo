import { chromium } from '@playwright/test';
import fs from 'fs';

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

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // Show errors
  const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
  if (errors.length > 0) {
    console.log('=== Errors ===');
    errors.slice(0, 10).forEach(m => console.log(`  [${m.type}] ${m.text.substring(0, 300)}`));
  } else {
    console.log('No errors.');
  }

  // Detailed canvas info
  const info = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { found: false };

    const result = {
      found: true,
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      webgl2: false,
      webgl: false,
      webglLost: false,
    };

    try {
      const gl2 = canvas.getContext('webgl2');
      if (gl2) {
        result.webgl2 = true;
        const px = new Uint8Array(4);
        gl2.readPixels(0, 0, 1, 1, gl2.RGBA, gl2.UNSIGNED_BYTE, px);
        result.pixel00 = Array.from(px);
        gl2.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl2.RGBA, gl2.UNSIGNED_BYTE, px);
        result.pixelCenter = Array.from(px);
        // Check all 4 corners and center
        gl2.readPixels(1, 1, 1, 1, gl2.RGBA, gl2.UNSIGNED_BYTE, px);
        result.pixelTL = Array.from(px);
        gl2.readPixels(canvas.width - 2, canvas.height - 2, 1, 1, gl2.RGBA, gl2.UNSIGNED_BYTE, px);
        result.pixelBR = Array.from(px);
        return result;
      }
    } catch (e) { /* ignore */ }

    try {
      const gl = canvas.getContext('webgl');
      if (gl) {
        result.webgl = true;
        const px = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        result.pixel00 = Array.from(px);
        gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        result.pixelCenter = Array.from(px);
        return result;
      }
    } catch (e) { /* ignore */ }

    // Check if context is lost
    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (ctx && ctx.isContextLost()) {
      result.webglLost = true;
    }
    return result;
  });

  console.log('\n=== Canvas Info ===');
  console.log(JSON.stringify(info, null, 2));

  await page.screenshot({ path: '/tmp/live2d-v4.png', fullPage: true });

  // Check screenshot brightness
  const screenshot = fs.readFileSync('/tmp/live2d-v4.png');
  console.log(`\nScreenshot size: ${screenshot.length} bytes`);
  if (screenshot.length < 5000) {
    console.log('Screenshot is very small (likely mostly black)');
  }

  await browser.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
