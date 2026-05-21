import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      consoleErrors.push(`[CONSOLE WARN] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}\n  ${err.stack || ''}`);
  });

  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Waiting 5 seconds for page to fully load...');
  await page.waitForTimeout(5000);

  // Get detailed info about Live2D-related DOM elements
  const domInfo = await page.evaluate(() => {
    const results = [];

    // Find all canvas elements
    document.querySelectorAll('canvas').forEach((c, i) => {
      const rect = c.getBoundingClientRect();
      results.push({
        type: 'canvas',
        index: i,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0,
        parent: c.parentElement?.className || c.parentElement?.tagName,
        id: c.id,
        className: c.className,
      });
    });

    // Find elements with live2d/cubism in class/id
    document.querySelectorAll('[class*="live2d"], [class*="Live2D"], [class*="cubism"], [id*="live2d"], [id*="cubism"]').forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      results.push({
        type: 'live2d-element',
        index: i,
        tag: el.tagName,
        text: el.textContent?.substring(0, 100),
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0,
        className: el.className,
        id: el.id,
        style: el.style?.cssText,
      });
    });

    // Check window object for Live2D globals
    const globalKeys = Object.keys(window).filter(k => /live2d|cubism/i.test(k));

    // Check for CubismModel class
    const hasCubismCore = !!window.CubismCore || !!window.CubismModel;

    return { results, globalKeys, hasCubismCore };
  });

  console.log('\n=== Canvas Elements ===');
  domInfo.results
    .filter(r => r.type === 'canvas')
    .forEach(c => {
      console.log(`  Canvas #${c.index}: ${c.width}x${c.height} (visible: ${c.visible})`);
      console.log(`    parent: ${c.parent}, id: "${c.id}", class: "${c.className}"`);
    });

  console.log('\n=== Live2D/Cubism DOM Elements ===');
  domInfo.results
    .filter(r => r.type === 'live2d-element')
    .forEach(el => {
      console.log(`  [${el.tag}] id="${el.id}" class="${el.className}" size: ${el.width}x${el.height} (visible: ${el.visible})`);
      console.log(`    text: "${el.text}"`);
    });

  console.log('\n=== Global Live2D Variables ===');
  console.log(`  Window keys matching live2d/cubism: ${domInfo.globalKeys.join(', ') || '(none)'}`);
  console.log(`  CubismCore/CubismModel available: ${domInfo.hasCubismCore}`);

  console.log('\n=== Console Errors/Warnings ===');
  if (consoleErrors.length === 0) {
    console.log('  (none)');
  } else {
    consoleErrors.forEach(e => console.log('  ' + e));
  }

  await browser.close();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
