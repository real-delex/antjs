/**
 * Scout Agent — Explores the application and maps all interactive surfaces
 * Discovers: pages, forms, buttons, navigation, dynamic content
 */

const Agent = require('../core/Agent');

class ScoutAgent extends Agent {
  constructor(name, type, config, aiProvider) {
    super(name, type || 'scout', config, aiProvider);
    this.discovery = {
      pages: [],
      elements: [],
      forms: [],
      navigation: [],
      dynamicRegions: [],
    };
  }

  async run(context) {
    const { browser, url, config } = context;
    const maxDepth = config.depth || 3;
    const visited = new Set();
    const queue = [{ url, depth: 0 }];

    this.log(`🔍 Starting discovery at ${url} with depth ${maxDepth}`);

    while (queue.length > 0) {
      const { url: currentUrl, depth } = queue.shift();

      if (visited.has(currentUrl) || depth > maxDepth) continue;
      visited.add(currentUrl);

      try {
        await browser.navigate(currentUrl);
        const pageData = await browser.discoverElements();

        const pageInfo = {
          url: currentUrl,
          title: pageData.title,
          depth,
          elements: pageData.elements.length,
          timestamp: Date.now(),
        };
        this.discovery.pages.push(pageInfo);
        this.discovery.elements.push(...pageData.elements.map(e => ({ ...e, pageUrl: currentUrl })));

        this.log(`📄 Discovered ${pageData.elements.length} elements on "${pageData.title}"`);

        // AI-enhanced analysis of the page
        await this._analyzePageWithAI(pageData, currentUrl);

        // Find links to explore deeper
        if (depth < maxDepth) {
          const links = await this._extractLinks(browser, currentUrl, config);
          for (const link of links) {
            if (!visited.has(link)) {
              queue.push({ url: link, depth: depth + 1 });
            }
          }
        }

      } catch (error) {
        this.log(`⚠️ Failed to explore ${currentUrl}: ${error.message}`, 'warn');
      }
    }

    this.log(`✅ Scout complete: ${this.discovery.pages.length} pages, ${this.discovery.elements.length} elements`);
    return this.discovery;
  }

  async _analyzePageWithAI(pageData, url) {
    const prompt = `Analyze this web page and identify:
1. Forms (login, search, contact, etc.)
2. Navigation patterns
3. Dynamic content regions
4. Critical user paths

Page: ${pageData.title} (${url})
Elements: ${JSON.stringify(pageData.elements.slice(0, 30))}

Return JSON: { forms: [...], navigation: [...], dynamicRegions: [...], criticalPaths: [...] }`;

    try {
      const analysis = await this.think(prompt);
      const parsed = JSON.parse(analysis.match(/\{[\s\S]*\}/)?.[0] || '{}');

      if (parsed.forms) this.discovery.forms.push(...parsed.forms.map(f => ({ ...f, pageUrl: url })));
      if (parsed.navigation) this.discovery.navigation.push(...parsed.navigation.map(n => ({ ...n, pageUrl: url })));
      if (parsed.dynamicRegions) this.discovery.dynamicRegions.push(...parsed.dynamicRegions.map(r => ({ ...r, pageUrl: url })));

      this.log(`🧠 AI identified ${parsed.forms?.length || 0} forms, ${parsed.navigation?.length || 0} nav items`);
    } catch (err) {
      this.log(`AI analysis skipped: ${err.message}`, 'warn');
    }
  }

  async _extractLinks(browser, baseUrl, config) {
    const excludePatterns = config.excludePatterns || [];
    const includePatterns = config.includePatterns || [];

    const links = await browser.page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(href => href.startsWith(window.location.origin));
    });

    return links.filter(link => {
      // Exclude patterns
      if (excludePatterns.some(p => link.includes(p))) return false;
      // Include patterns (if specified)
      if (includePatterns.length > 0 && !includePatterns.some(p => link.includes(p))) return false;
      return true;
    });
  }
}

module.exports = ScoutAgent;
