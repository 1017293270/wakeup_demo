import { chromium } from 'playwright'

const VIEWPORTS = [
  { width: 1366, height: 640, name: 'laptop-1366x640-browser-content' },
  { width: 1366, height: 768, name: 'laptop-1366x768' },
  { width: 1440, height: 900, name: 'laptop-1440x900' },
  { width: 1920, height: 1080, name: 'desktop-1920x1080' }
]

const url = process.env.DASHBOARD_URL || 'http://127.0.0.1:5173/'

const browser = await chromium.launch({ headless: true })

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport })
    await page.goto(url, { waitUntil: 'networkidle' })

    const fit = await page.evaluate(() => {
      const signalStrip = document.querySelector('.signal-strip')
      const screen = document.querySelector('.dashboard-screen')
      const panels = [...document.querySelectorAll('.data-panel')]
      const signalRect = signalStrip?.getBoundingClientRect()
      const screenRect = screen?.getBoundingClientRect()
      const clippedPanels = panels.filter((panel) => panel.scrollHeight > panel.clientHeight + 2).length

      return {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        signalBottom: signalRect?.bottom ?? null,
        screenBottom: screenRect?.bottom ?? null,
        clippedPanels
      }
    })

    const hasVerticalOverflow = fit.scrollHeight > fit.innerHeight + 2
    const hasHorizontalOverflow = fit.scrollWidth > fit.innerWidth + 2
    const isSignalVisible = fit.signalBottom !== null && fit.signalBottom <= fit.innerHeight + 2
    const isScreenVisible = fit.screenBottom !== null && fit.screenBottom <= fit.innerHeight + 2
    const hasClippedPanels = fit.clippedPanels > 0

    if (hasVerticalOverflow || hasHorizontalOverflow || !isSignalVisible || !isScreenVisible || hasClippedPanels) {
      throw new Error(
        `${viewport.name} does not fit: ${JSON.stringify({
          hasVerticalOverflow,
          hasHorizontalOverflow,
          isSignalVisible,
          isScreenVisible,
          hasClippedPanels,
          ...fit
        })}`
      )
    }

    await page.close()
  }
} finally {
  await browser.close()
}
