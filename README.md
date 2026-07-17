<p align="center">
  <img src="banner.png" alt="Ant.js — Self-Healing Test Colony" width="100%">
</p>

<h1 align="center">🐜 Ant.js</h1>
<p align="center">
  <b>Self-Healing Test Colony</b><br>
  Autonomous AI agents that explore, test, heal, and report on your web app — while you sleep.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@real-delex/antjs"><img src="https://img.shields.io/npm/v/@real-delex/antjs?style=flat-square&color=d35400" alt="npm"></a>
  <a href="https://github.com/real-delex/antjs"><img src="https://img.shields.io/github/stars/real-delex/antjs?style=flat-square&color=f39c12" alt="stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="license"></a>
</p>

> ⚠️ <b>Alpha / Proof of Concept</b><br>
> This project demonstrates the concept of AI-driven swarm testing.<br>

---

## What is Ant.js?

Ant.js is a <b>swarm-intelligence testing framework</b>. Instead of writing tests by hand, you launch a colony of specialized AI agents that:

1. <b>Explore</b> your app like a real user would
2. <b>Generate</b> test scenarios based on what they find
3. <b>Execute</b> those tests in a real browser
4. <b>Self-heal</b> when UI changes break selectors
5. <b>Report</b> everything in a beautiful HTML dashboard

No test code to maintain. No brittle selectors. Just run and watch.

---

## 🚀 Quick Start

```bash
# Using Node.js
npm install

node bin/antjs.js init
node bin/antjs.js run
```

---

## 🏗️ How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    🐜  Ant.js Colony                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Phase 1: 🕵️ Scout                                     │
│   Opens your app in a real browser and maps every       │
│   button, form, link, and input field it can find.      │
│                                                         │
│   Phase 2: 🧠 Analyst                                   │
│   Feeds the discovery to AI and generates realistic     │
│   test scenarios — prioritized by business risk.        │
│                                                         │
│   Phase 3: 🎭 Actor                                     │
│   Executes each scenario in Playwright: clicks, fills,  │
│   navigates, asserts. Captures screenshots on failure.  │
│                                                         │
│   Phase 4: 🔧 Healer                                    │
│   If a test fails because a selector changed (not a     │
│   real bug), AI finds the new element and fixes it.     │
│                                                         │
│   Phase 5: 📊 Reporter                                  │
│   Generates a rich HTML report with screenshots,        │
│   AI diagnostics, and a timeline of the entire run.     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Why Ant.js?

| Problem | Traditional Testing | Ant.js |
|---------|-------------------|--------|
| Writing tests | Hours of manual work | <b>AI generates them</b> |
| UI redesign breaks tests | Everything breaks | <b>Self-healing with AI</b> |
| Maintenance burden | Constant updates | <b>Zero maintenance</b> |
| Coverage gaps | Only what you thought of | <b>Discovers hidden paths</b> |
| Debugging failures | Reproduce manually | <b>Screenshots + AI diagnosis</b> |

---

## 🤖 AI Providers

Ant.js works with any AI provider — cloud or local:

| Provider | Setup | Best For |
|----------|-------|----------|
| <b>OpenAI</b> | `provider: 'openai'` + API key | Best quality, fastest |
| <b>Anthropic</b> | `provider: 'anthropic'` + API key | Deep reasoning, large context |
| <b>Ollama</b> | `provider: 'ollama'` + local server | Free, private, offline |
| <b>OpenRouter</b> | `provider: 'openrouter'` + API key | 200+ models in one place |
| <b>Custom</b> | `provider: 'custom'` + baseUrl | Any OpenAI-compatible endpoint |

### Using Custom Provider (LM Studio, Groq, etc.)

```javascript
// LM Studio — local GUI server
module.exports = {
  ai: {
    provider: 'custom',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
    apiKey: 'lm-studio',
  },
};
```

```javascript
// Groq — blazing fast inference
module.exports = {
  ai: {
    provider: 'custom',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-70b-versatile',
    apiKey: process.env.GROQ_API_KEY,
  },
};
```

---

## ⚙️ Configuration

Create `antjs.config.js` in your project root:

```javascript
module.exports = {
  ai: {
    provider: 'openrouter',
    model: 'openai/gpt-4o',
    apiKey: process.env.OPENROUTER_API_KEY,
  },
  test: {
    url: 'https://your-app.com',
    depth: 2,
    excludePatterns: ['/admin', '/logout'],
  },
  colony: {
    headless: true,
    retries: 2,
  },
  report: {
    outputDir: './antjs-reports',
    saveScreenshots: true,
  },
};
```

Or use environment variables:
```bash
ANTJS_AI_PROVIDER=openai
ANTJS_AI_MODEL=gpt-4o
ANTJS_AI_KEY=sk-...
ANTJS_TEST_URL=https://your-app.com
```

---

## 🧪 Example: Programmatic Usage

```javascript
const AntJS = require('@real-delex/antjs');

async function main() {
  const colony = await AntJS.create({
    url: 'https://your-app.com',
    ai: { provider: 'openai', model: 'gpt-4o', apiKey: process.env.OPENAI_API_KEY },
  });

  colony.on('log', (entry) => console.log(entry.message));

  await colony.initialize();
  const results = await colony.run('https://your-app.com');

  console.log(`Passed: ${results.actor.results.filter(r => r.status === 'passed').length}`);
  console.log(`Report: ${results.reporter.htmlPath}`);

  await colony.shutdown();
}

main();
```

---

## 🖼️ Report Preview

After each run, Ant.js generates an HTML report with:
- Pass/fail statistics
- Screenshots of every step
- AI-generated diagnosis of failures
- Timeline of the entire colony mission
- AI analysis log

Open `./antjs-reports/report.html` in your browser.

---

## 🛣️ Roadmap

- [ ] Visual test diffing (pixel-perfect comparison)
- [ ] CI/CD GitHub Action
- [ ] Parallel agent execution
- [ ] Custom agent plugins
- [ ] Accessibility (a11y) testing agent
- [ ] Performance / Lighthouse integration

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📄 License

MIT © Ant.js Contributors
