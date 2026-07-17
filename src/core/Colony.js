/**
 * Colony — The central orchestrator of all agents
 * Manages agent lifecycle, parallel execution, and result aggregation
 */

const EventEmitter = require('events');
const ScoutAgent = require('../agents/ScoutAgent');
const AnalystAgent = require('../agents/AnalystAgent');
const ActorAgent = require('../agents/ActorAgent');
const HealerAgent = require('../agents/HealerAgent');
const ReporterAgent = require('../agents/ReporterAgent');
const BrowserController = require('../browser/BrowserController');

class Colony extends EventEmitter {
  constructor(config, aiProvider) {
    super();
    this.config = config;
    this.ai = aiProvider;
    this.agents = new Map();
    this.browser = null;
    this.results = {
      scout: null,
      analyst: null,
      actor: null,
      healer: null,
      reporter: null,
    };
    this.colonyState = 'idle'; // idle | scouting | analyzing | acting | healing | reporting | completed
  }

  /**
   * Initialize the colony: browser, agents, event bindings
   */
  async initialize() {
    this.log('🐜 Initializing Ant.js Colony...');

    // Initialize browser
    this.browser = new BrowserController(this.config);
    await this.browser.launch();
    this.log('🌐 Browser launched');

    // Create agents
    this._createAgents();
    this.log(`🧑‍🚀 Created ${this.agents.size} agents`);

    // Bind agent events
    this._bindAgentEvents();

    this.colonyState = 'ready';
    this.emit('ready', { colony: this });
    return this;
  }

  _createAgents() {
    const agentConfigs = [
      { name: 'scout-1', type: 'scout', Class: ScoutAgent },
      { name: 'analyst-1', type: 'analyst', Class: AnalystAgent },
      { name: 'actor-1', type: 'actor', Class: ActorAgent },
      { name: 'healer-1', type: 'healer', Class: HealerAgent },
      { name: 'reporter-1', type: 'reporter', Class: ReporterAgent },
    ];

    for (const cfg of agentConfigs) {
      const agent = new cfg.Class(cfg.name, cfg.type, this.config, this.ai);
      this.agents.set(cfg.name, agent);
    }
  }

  _bindAgentEvents() {
    for (const agent of this.agents.values()) {
      agent.on('log', (entry) => this.emit('agent:log', entry));
      agent.on('completed', (data) => this.emit('agent:completed', data));
      agent.on('error', (data) => this.emit('agent:error', data));
    }
  }

  /**
   * Run the full colony workflow
   */
  async run(url) {
    if (this.colonyState === 'running') {
      throw new Error('Colony is already running');
    }

    this.colonyState = 'running';
    this.log(`🚀 Colony mission started: ${url}`);
    this.emit('started', { url, colony: this });

    const startTime = Date.now();

    try {
      // Phase 1: Scout — Map the application
      this.colonyState = 'scouting';
      this.log('🔍 Phase 1: Scout Agents exploring...');
      const scout = this.agents.get('scout-1');
      this.results.scout = await scout.execute({ 
        browser: this.browser, 
        url,
        config: this.config.get(['test']),
      });

      // Phase 2: Analyst — Prioritize test scenarios
      this.colonyState = 'analyzing';
      this.log('🧠 Phase 2: Analyst Agents prioritizing...');
      const analyst = this.agents.get('analyst-1');
      this.results.analyst = await analyst.execute({
        browser: this.browser,
        discovery: this.results.scout,
        config: this.config.get(['test']),
      });

      // Phase 3: Actor — Execute tests
      this.colonyState = 'acting';
      this.log('🎭 Phase 3: Actor Agents testing...');
      const actor = this.agents.get('actor-1');
      this.results.actor = await actor.execute({
        browser: this.browser,
        scenarios: this.results.analyst.scenarios,
        config: this.config.get(['test']),
      });

      // Phase 4: Healer — Fix broken tests (if any failures)
      const failures = this.results.actor.results.filter(r => r.status === 'failed');
      if (failures.length > 0) {
        this.colonyState = 'healing';
        this.log(`🔧 Phase 4: Healer Agents fixing ${failures.length} failures...`);
        const healer = this.agents.get('healer-1');
        this.results.healer = await healer.execute({
          browser: this.browser,
          failures,
          discovery: this.results.scout,
          config: this.config.get(['test']),
        });
      }

      // Phase 5: Reporter — Generate report
      this.colonyState = 'reporting';
      this.log('📊 Phase 5: Reporter Agents generating report...');
      const reporter = this.agents.get('reporter-1');
      this.results.reporter = await reporter.execute({
        results: this.results,
        config: this.config.get(['report']),
        duration: Date.now() - startTime,
      });

      this.colonyState = 'completed';
      this.log(`✅ Colony mission completed in ${Date.now() - startTime}ms`);
      this.emit('completed', { results: this.results, colony: this });

      return this.results;

    } catch (error) {
      this.colonyState = 'error';
      this.log(`💥 Colony mission failed: ${error.message}`, 'error');
      this.emit('error', { error, colony: this });
      throw error;
    }
  }

  /**
   * Run a single agent by name
   */
  async runAgent(agentName, context = {}) {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent "${agentName}" not found`);
    }
    context.browser = context.browser || this.browser;
    return await agent.execute(context);
  }

  /**
   * Get colony status overview
   */
  getStatus() {
    return {
      state: this.colonyState,
      agents: Array.from(this.agents.values()).map(a => a.getStats()),
      browser: this.browser ? 'connected' : 'disconnected',
      results: {
        scout: !!this.results.scout,
        analyst: !!this.results.analyst,
        actor: !!this.results.actor,
        healer: !!this.results.healer,
        reporter: !!this.results.reporter,
      },
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.log('🛑 Shutting down colony...');

    for (const agent of this.agents.values()) {
      if (agent.state === 'running') {
        agent.pause();
      }
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.colonyState = 'idle';
    this.log('👋 Colony shut down');
    this.emit('shutdown', { colony: this });
  }

  log(message, level = 'info') {
    const entry = {
      timestamp: Date.now(),
      source: 'Colony',
      level,
      message,
    };
    this.emit('log', entry);
  }
}

module.exports = Colony;
