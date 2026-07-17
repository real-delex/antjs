/**
 * Reporter Agent — Generates rich HTML/JSON/JUnit reports
 * Includes: screenshots, AI diagnostics, timeline, coverage stats
 */

const fs = require('fs');
const path = require('path');
const Agent = require('../core/Agent');

class ReporterAgent extends Agent {
  constructor(name, type, config, aiProvider) {
    super(name, type || 'reporter', config, aiProvider);
  }

  async run(context) {
    const { results, config, duration } = context;
    const outputDir = config.outputDir || './antjs-reports';

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const report = this._buildReport(results, duration);

    const htmlPath = path.join(outputDir, 'report.html');
    fs.writeFileSync(htmlPath, this._generateHTML(report));

    const jsonPath = path.join(outputDir, 'report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    this.log(`📊 Reports generated: ${htmlPath}, ${jsonPath}`);
    return { htmlPath, jsonPath, report };
  }

  _buildReport(results, duration) {
    const actorResults = results.actor?.results || [];
    const passed = actorResults.filter(r => r.status === 'passed').length;
    const failed = actorResults.filter(r => r.status === 'failed').length;
    const healed = results.healer?.fixes?.filter(f => f.healed).length || 0;

    return {
      summary: {
        totalScenarios: actorResults.length,
        passed,
        failed,
        healed,
        duration,
        successRate: actorResults.length > 0 ? ((passed / actorResults.length) * 100).toFixed(1) : 0,
      },
      discovery: {
        pages: results.scout?.pages?.length || 0,
        elements: results.scout?.elements?.length || 0,
        forms: results.scout?.forms?.length || 0,
      },
      scenarios: actorResults,
      healing: results.healer?.fixes || [],
      generatedAt: new Date().toISOString(),
      version: require('../../package.json').version,
    };
  }

  _generateHTML(report) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>🐜 Ant.js Report</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 2rem; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    h1 { color: #d35400; margin-top: 0; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .stat-card { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; text-align: center; border-left: 4px solid #d35400; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #2c3e50; }
    .stat-label { color: #7f8c8d; font-size: 0.9rem; margin-top: 0.5rem; }
    .passed { color: #27ae60; } .failed { color: #e74c3c; } .healed { color: #f39c12; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge-pass { background: #d4edda; color: #155724; }
    .badge-fail { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🐜 Ant.js Test Colony Report</h1>
    <p>Generated at ${report.generatedAt} • Version ${report.version}</p>
    <div class="stats">
      <div class="stat-card"><div class="stat-value">${report.summary.totalScenarios}</div><div class="stat-label">Scenarios</div></div>
      <div class="stat-card"><div class="stat-value passed">${report.summary.passed}</div><div class="stat-label">Passed</div></div>
      <div class="stat-card"><div class="stat-value failed">${report.summary.failed}</div><div class="stat-label">Failed</div></div>
      <div class="stat-card"><div class="stat-value healed">${report.summary.healed}</div><div class="stat-label">AI analysis</div></div>
      <div class="stat-card"><div class="stat-value">${report.summary.successRate}%</div><div class="stat-label">Success Rate</div></div>
      <div class="stat-card"><div class="stat-value">${(report.summary.duration / 1000).toFixed(1)}s</div><div class="stat-label">Duration</div></div>
    </div>
    <h2>📋 Scenario Results</h2>
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Screenshot</th><th>Details</th></tr></thead>
      <tbody>
        ${report.scenarios.map(s => `
          <tr>
            <td>${s.scenarioId}</td>
            <td>${s.name}</td>
            <td><span class="badge badge-${s.status === 'passed' ? 'pass' : 'fail'}">${s.status.toUpperCase()}</span></td>
            <td>${s.screenshotSkipped ? 'skipped (limit)' : (s.screenshot ? 'saved' : 'none')}</td>
            <td>${s.error || 'OK'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${report.healing.length > 0 ? `
    <h2>🔧 AI Analysis Log</h2>
    <table>
      <thead><tr><th>Scenario</th><th>Analyzed</th><th>Diagnosis</th></tr></thead>
      <tbody>
        ${report.healing.map(h => `
          <tr>
            <td>${h.scenarioId}</td>
            <td>${h.healed ? '✅ Analyzed' : '❌ Failed'}</td>
            <td>${h.fix?.diagnosis || h.error || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
  </div>
</body>
</html>`;
  }
}

module.exports = ReporterAgent;
