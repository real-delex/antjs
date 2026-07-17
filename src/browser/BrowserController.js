/**
 * Browser Controller — Playwright wrapper with AI-enhanced element detection
 * Provides: page navigation, element discovery, screenshot capture, healing hints
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');

class BrowserController {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.sessionLog = [];
  }

  async launch() {
    const browserType = this.config.get(['browser', 'type']) || 'chromium';
    const launchOptions = {
      headless: this.config.get(['colony', 'headless']) !== false,
      slowMo: this.config.get(['colony', 'slowMo']) || 0,
      ...this.config.get(['browser', 'launchOptions']),
    };

    const browserMap = { chromium, firefox, webkit };
    this.browser = await browserMap[browserType].launch(launchOptions);

    this.context = await this.browser.newContext({
      viewport: this.config.get(['colony', 'viewport']) || { width: 1280, height: 720 },
    });

    this.page = await this.context.newPage();
    this.log('Browser launched');
    return this;
  }

  async navigate(url) {
    this.log(`Navigating to ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    return this.page;
  }

  /**
   * Discover interactive elements on the current page
   * Returns structured data for AI analysis
   */
  async discoverElements() {
    const elements = await this.page.evaluate(() => {
      const interactive = [];
      const selectors = [
        'button', 'a[href]', 'input', 'select', 'textarea',
        '[role="button"]', '[role="link"]', '[role="menuitem"]',
        '[onclick]', '[data-testid]', '[data-test]'
      ];

      document.querySelectorAll(selectors.join(', ')).forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          interactive.push({
            index,
            tag: el.tagName.toLowerCase(),
            type: el.type || null,
            text: (el.innerText || el.textContent || el.value || el.placeholder || '').trim().slice(0, 100),
            id: el.id || null,
            className: el.className || null,
            testId: el.getAttribute('data-testid') || el.getAttribute('data-test') || null,
            role: el.getAttribute('role') || null,
            href: el.getAttribute('href') || null,
            selector: generateSelector(el),
            xpath: generateXPath(el),
            position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            visible: rect.width > 0 && rect.height > 0,
          });
        }
      });

      function generateSelector(el) {
        if (el.id) return `#${el.id}`;
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        const tag = el.tagName.toLowerCase();
        const classes = Array.from(el.classList).slice(0, 2).join('.');
        return classes ? `${tag}.${classes}` : tag;
      }

      function generateXPath(el) {
        const idx = Array.from(el.parentNode?.children || []).indexOf(el) + 1;
        const tag = el.tagName.toLowerCase();
        return `//${tag}[${idx}]`;
      }

      return interactive;
    });

    return {
      url: this.page.url(),
      title: await this.page.title(),
      elements,
      timestamp: Date.now(),
    };
  }

  /**
   * AI-enhanced element finding with fallback strategies
   */
  async findElement(description, aiProvider) {
    // Strategy 1: Try exact selectors first
    const discovery = await this.discoverElements();

    // Strategy 2: Ask AI to identify the best selector
    const prompt = `Given this page structure and the description "${description}", find the best selector.

Page: ${discovery.title} (${discovery.url})
Elements: ${JSON.stringify(discovery.elements.slice(0, 20), null, 2)}

Return ONLY a JSON object with: { "selector": "css or xpath", "strategy": "css|xpath|text", "confidence": 0-1 }`;

    try {
      const result = await aiProvider.structured(prompt, {
        selector: 'string',
        strategy: 'string',
        confidence: 'number',
      });

      if (result.confidence > 0.7) {
        this.log(`AI found element for "${description}": ${result.selector}`);
        return result;
      }
    } catch (err) {
      this.log(`AI element finding failed: ${err.message}`, 'warn');
    }

    return null;
  }

  async screenshot(name = 'screenshot') {
    // Sanitize filename: remove/replace characters illegal in Windows filenames
    const safeName = name
      .replace(/[\/:*?"<>|]/g, '_')  // Windows forbidden chars
      .replace(/\s+/g, '_')            // spaces → underscores
      .slice(0, 100);                  // limit length

    const outputDir = this.config.get(['report', 'outputDir']) || './antjs-reports';
    const screenshotDir = `${outputDir}/screenshots`;

    // Ensure directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const filePath = `${screenshotDir}/${safeName}-${Date.now()}.png`;
    await this.page.screenshot({ path: filePath, fullPage: true });
    this.log(`Screenshot saved: ${filePath}`);
    return filePath;
  }

  async getPageSource() {
    return await this.page.content();
  }

  async getConsoleLogs() {
    // Playwright doesn't persist logs by default; this is a placeholder
    return [];
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.log('Browser closed');
  }

  log(message, level = 'info') {
    this.sessionLog.push({ timestamp: Date.now(), message, level });
  }
}

module.exports = BrowserController;
