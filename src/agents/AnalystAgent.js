/**
 * Analyst Agent — Prioritizes test scenarios by risk, impact, and coverage
 * Generates: test plans, scenario rankings, edge case predictions
 */

const Agent = require('../core/Agent');

class AnalystAgent extends Agent {
  constructor(name, type, config, aiProvider) {
    super(name, type || 'analyst', config, aiProvider);
    this.scenarios = [];
  }

  async run(context) {
    const { browser, discovery, config } = context;

    this.log(`🧠 Analyzing ${discovery.pages.length} pages and ${discovery.elements.length} elements`);

    // Phase 1: AI-powered scenario generation
    const aiScenarios = await this._generateScenariosWithAI(discovery);

    // Phase 2: Risk and impact scoring
    const scoredScenarios = await this._scoreScenarios(aiScenarios, discovery);

    // Phase 3: Prioritize and deduplicate
    this.scenarios = this._prioritizeScenarios(scoredScenarios);

    this.log(`📋 Generated ${this.scenarios.length} prioritized test scenarios`);
    return { scenarios: this.scenarios };
  }

  async _generateScenariosWithAI(discovery) {
    const prompt = `You are a senior QA engineer. Based on the following application discovery, generate comprehensive test scenarios.

Pages discovered: ${discovery.pages.length}
Forms: ${discovery.forms.length}
Navigation items: ${discovery.navigation.length}
Total interactive elements: ${discovery.elements.length}

Sample elements: ${JSON.stringify(discovery.elements.slice(0, 20), null, 2)}

Generate test scenarios covering:
1. Critical user paths (login, checkout, core workflows)
2. Form validation (valid/invalid inputs, edge cases)
3. Navigation and routing
4. Error handling and edge cases
5. Accessibility basics

For each scenario provide: id, name, description, priority (critical|high|medium|low), steps (array), expectedResult, pageUrl.

IMPORTANT — Each step MUST have these exact fields:
- "action": one of "navigate" | "click" | "fill" | "assertVisible" | "assertText"
- "target": CSS selector string (e.g. "input.new-todo", "button.submit")
- "value": string value (only for "fill" action, otherwise omit or use null)

Example step: { "action": "fill", "target": "input.new-todo", "value": "Buy milk" }
Example step: { "action": "click", "target": "button[type=submit]" }

Return as JSON array.`;

    try {
      const response = await this.think(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      let scenarios = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');

      // Validate and fix steps
      scenarios = scenarios.map(s => {
        if (!s.steps || !Array.isArray(s.steps)) {
          s.steps = [{ action: 'navigate', target: s.pageUrl || '/' }];
        }
        s.steps = s.steps.map((step, idx) => {
          if (!step.action) {
            this.log(`⚠️ Step ${idx} in "${s.name}" missing action, defaulting to navigate`, 'warn');
            step.action = 'navigate';
          }
          if (!step.target && step.action !== 'navigate') {
            step.target = 'body';
          }
          return step;
        });
        return s;
      });

      this.log(`🤖 AI generated ${scenarios.length} scenarios`);
      return scenarios;
    } catch (err) {
      this.log(`AI scenario generation failed: ${err.message}`, 'warn');
      return this._fallbackScenarios(discovery);
    }
  }

  _fallbackScenarios(discovery) {
    // Basic fallback if AI fails
    const scenarios = [];

    for (const page of discovery.pages) {
      scenarios.push({
        id: `nav-${page.url}`,
        name: `Navigate to ${page.title}`,
        description: `Verify page loads and basic elements are present`,
        priority: 'high',
        steps: [{ action: 'navigate', target: page.url }],
        expectedResult: 'Page loads without errors',
        pageUrl: page.url,
      });
    }

    for (const form of discovery.forms || []) {
      scenarios.push({
        id: `form-${form.name || 'unknown'}`,
        name: `Test form: ${form.name || 'Unknown'}`,
        description: `Submit form with valid and invalid data`,
        priority: 'critical',
        steps: [
          { action: 'navigate', target: form.pageUrl },
          { action: 'fill', target: form.fields?.[0]?.selector, value: 'test@example.com' },
          { action: 'click', target: form.submitSelector },
        ],
        expectedResult: 'Form submits successfully or shows validation errors',
        pageUrl: form.pageUrl,
      });
    }

    return scenarios;
  }

  async _scoreScenarios(scenarios, discovery) {
    const prompt = `Score these test scenarios by risk and business impact. Consider:
- User-facing vs internal pages
- Data mutation potential
- Authentication requirements
- Complexity

Scenarios: ${JSON.stringify(scenarios.slice(0, 10))}

Return JSON array with added fields: riskScore (1-10), impactScore (1-10), complexityScore (1-10), overallScore (calculated as risk * impact / complexity).`;

    try {
      const response = await this.think(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const scored = JSON.parse(jsonMatch ? jsonMatch[0] : '[]');

      // Merge scores back into scenarios
      return scenarios.map((s, i) => ({
        ...s,
        ...(scored[i] || {}),
        overallScore: scored[i]?.overallScore || 5,
      }));
    } catch (err) {
      this.log(`AI scoring failed, using defaults`, 'warn');
      return scenarios.map(s => ({ ...s, riskScore: 5, impactScore: 5, complexityScore: 5, overallScore: 5 }));
    }
  }

  _prioritizeScenarios(scenarios) {
    // Sort by overallScore descending, then by priority
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    return scenarios
      .sort((a, b) => {
        const scoreDiff = (b.overallScore || 0) - (a.overallScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      })
      .map((s, index) => ({ ...s, rank: index + 1 }));
  }
}

module.exports = AnalystAgent;
