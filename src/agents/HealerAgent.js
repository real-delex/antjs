/**
 * Healer Agent — Fixes broken selectors and flaky tests using AI
 * Analyzes DOM changes and suggests new selectors or test logic
 */

const Agent = require('../core/Agent');

class HealerAgent extends Agent {
  constructor(name, type, config, aiProvider) {
    super(name, type || 'healer', config, aiProvider);
    this.fixes = [];
  }

  async run(context) {
    const { browser, failures, discovery } = context;

    this.log(`🔧 Healing ${failures.length} failed scenarios with AI...`);

    for (const failure of failures) {
      const fix = await this._healFailure(browser, failure, discovery);
      this.fixes.push(fix);
    }

    return { fixes: this.fixes };
  }

  async _healFailure(browser, failure, discovery) {
    this.log(`🔍 Analyzing failure: ${failure.name}`);

    await browser.navigate(failure.scenario?.pageUrl || discovery.pages[0]?.url);
    const currentDiscovery = await browser.discoverElements();
    const screenshot = await browser.screenshot(`heal-${failure.scenarioId}`);

    const prompt = `You are a test repair AI. A test failed with this error:
"${failure.error}"

Original scenario: ${JSON.stringify(failure, null, 2)}

Current page elements: ${JSON.stringify(currentDiscovery.elements.slice(0, 15), null, 2)}

Suggest a fix. Return JSON:
{
  "diagnosis": "why it failed",
  "newSelectors": { "oldSelector": "newSelector" },
  "suggestedAction": "retry|skip|update_test",
  "confidence": 0.0-1.0
}`;

    try {
      const healing = await this.think(prompt);
      const jsonMatch = healing.match(/\{[\s\S]*\}/);
      const fix = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

      this.log(`💊 Healed "${failure.name}": ${fix.diagnosis || 'No diagnosis'} (confidence: ${fix.confidence})`);

      return {
        scenarioId: failure.scenarioId,
        originalError: failure.error,
        fix,
        screenshot,
        healed: fix.confidence > 0.6,
      };
    } catch (err) {
      this.log(`❌ Healing failed for "${failure.name}": ${err.message}`, 'warn');
      return {
        scenarioId: failure.scenarioId,
        originalError: failure.error,
        healed: false,
        error: err.message,
      };
    }
  }
}

module.exports = HealerAgent;
