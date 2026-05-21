import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture full error details including stack traces
  page.on('pageerror', (error) => {
    console.log('\n=== PAGE ERROR ===');
    console.log(`Message: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
    console.log(`Name: ${error.name}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const location = msg.location();
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      if (location.url) {
        console.log(`  at ${location.url}:${location.lineNumber}:${location.columnNumber}`);
      }
    }
  });

  console.log('Navigating to http://localhost:5178...');
  await page.goto('http://localhost:5178', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait 10 seconds for full load
  console.log('Waiting 10 seconds for full load...');
  await page.waitForTimeout(10000);

  // Evaluate in page context to get any runtime errors
  const runtimeErrors = await page.evaluate(() => {
    const errors: string[] = [];
    // Check if window.onerror has captured anything
    return errors;
  });

  // Check Live2D canvas
  const canvasExists = await page.$('canvas.live2d-canvas');
  console.log(`\nCanvas element exists: ${!!canvasExists}`);

  // Check fallback message
  const fallbackMsg = await page.$('.live2d-load-message');
  if (fallbackMsg) {
    const text = await fallbackMsg.textContent();
    console.log(`Fallback message: ${text}`);
  }

  // Try to get more info about the Live2D state
  const live2dState = await page.evaluate(() => {
    const shell = document.querySelector('.live2d-shell');
    return shell ? shell.className : 'not found';
  });
  console.log(`Live2D shell classes: ${live2dState}`);

  console.log('\n=== Done ===');
  await browser.close();
})();
