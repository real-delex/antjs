/**
 * Actor Agent — Executes test scenarios via real browser
 * Self-healing: on failure, triggers Healer Agent automatically
 */

const Agent = require('../core/Agent');

class ActorAgent extends Agent {
  constructor(name, type, config, aiProvider) {
    super(name, type || 'actor', config, aiProvider);
    this.results = [];
    this.screenshotCount = 0;
    this.maxScreenshots = 3;
  }

  async run(context) {
    const { browser, scenarios, config } = context;
    const retries = this.config.get(['colony', 'retries']) || 2;

    this.log(`🎭 Starting execution of ${scenarios.length} scenarios`);

    for (const scenario of scenarios.slice(0, 20)) {
      const result = await this._executeScenario(browser, scenario, retries);
      this.results.push(result);
      this.emit('scenario:completed', { scenario, result });
    }

    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    this.log(`📊 Results: ${passed} passed, ${failed} failed out of ${this.results.length}`);
    if (failed > 0) {
      this.log(`📸 Screenshots saved for first ${Math.min(failed, this.maxScreenshots)} failures (skipped ${Math.max(0, failed - this.maxScreenshots)} duplicates)`);
    }

    return { results: this.results };
  }

  async _executeScenario(browser, scenario, maxRetries) {
    let lastError = null;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        await browser.navigate(scenario.pageUrl);
        const stepResults = [];

        for (const step of scenario.steps || []) {
          const stepResult = await this._executeStep(browser, step);
          stepResults.push(stepResult);
          if (!stepResult.success) throw new Error(stepResult.error);
        }

        return {
          scenarioId: scenario.id,
          name: scenario.name,
          status: 'passed',
          duration: Date.now(),
          steps: stepResults,
          screenshot: null,
        };

      } catch (error) {
        lastError = error;
        attempts++;
        this.log(`⚠️ Scenario "${scenario.name}" failed (attempt ${attempts}): ${error.message}`, 'warn');

        if (attempts <= maxRetries) {
          this.log(`🔄 Retrying "${scenario.name}"...`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    const shouldScreenshot = this.screenshotCount < this.maxScreenshots;
    const screenshotPath = shouldScreenshot
      ? await browser.screenshot(`fail-${scenario.id}`)
      : null;
    if (shouldScreenshot) this.screenshotCount++;

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      status: 'failed',
      error: lastError?.message,
      attempts,
      screenshot: screenshotPath,
      screenshotSkipped: !shouldScreenshot,
    };
  }

  async _executeStep(browser, step) {
    const { action, target, value } = step;
    const page = browser.page;

    if (!action || action === 'undefined') {
      return {
        action: action || 'undefined',
        success: false,
        error: `Step is missing "action" field. Received: ${JSON.stringify(step)}. The AI-generated test scenario has an invalid step format.`,
      };
    }

    try {
      switch (action) {
        case 'navigate':
          await page.goto(target, { waitUntil: 'networkidle' });
          return { action, success: true };

        case 'click':
          await page.click(target);
          return { action, target, success: true };

        case 'fill':
          await page.fill(target, value);
          return { action, target, value, success: true };

        case 'select':
          await page.selectOption(target, value);
          return { action, target, value, success: true };

        case 'wait':
          await page.waitForTimeout(value || 1000);
          return { action, success: true };

        case 'assertText':
          const text = await page.textContent(target);
          const success = text.includes(value);
          return { action, target, success, actual: text };

        case 'assertVisible':
          await page.waitForSelector(target, { state: 'visible', timeout: 5000 });
          return { action, target, success: true };

        default:
          return { action, success: false, error: `Unknown action: "${action}". Supported: navigate, click, fill, select, wait, assertText, assertVisible.` };
      }
    } catch (error) {
      return { action, target, success: false, error: error.message };
    }
  }
}

module.exports = ActorAgent;
