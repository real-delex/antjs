/**
 * Base Agent class — all specialized agents extend this
 * Provides: lifecycle hooks, AI integration, messaging, state management
 */

const EventEmitter = require('events');

class Agent extends EventEmitter {
  constructor(name, type, config, aiProvider) {
    super();
    this.name = name;
    this.type = type;
    this.config = config;
    this.ai = aiProvider;
    this.state = 'idle'; // idle | running | paused | completed | error
    this.memory = []; // Agent's working memory
    this.logs = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Main execution loop — override in subclasses
   */
  async execute(context = {}) {
    this.state = 'running';
    this.startTime = Date.now();
    this.log(`🚀 Agent "${this.name}" (${this.type}) started`);

    try {
      const result = await this.run(context);
      this.state = 'completed';
      this.endTime = Date.now();
      this.log(`✅ Agent "${this.name}" completed in ${this.duration}ms`);
      this.emit('completed', { agent: this, result });
      return result;
    } catch (error) {
      this.state = 'error';
      this.endTime = Date.now();
      this.log(`❌ Agent "${this.name}" failed: ${error.message}`);
      this.emit('error', { agent: this, error });
      throw error;
    }
  }

  /**
   * Override this method in subclasses
   */
  async run(context) {
    throw new Error(`Agent ${this.name} must implement run() method`);
  }

  /**
   * Query AI with structured prompt
   */
  async think(prompt, options = {}) {
    this.log(`🧠 Thinking...`);
    const response = await this.ai.complete(prompt, {
      temperature: this.config.get(['ai', 'temperature']),
      maxTokens: this.config.get(['ai', 'maxTokens']),
      ...options,
    });
    this.remember({ role: 'assistant', content: response });
    return response;
  }

  /**
   * Add to agent's memory
   */
  remember(entry) {
    this.memory.push({
      ...entry,
      timestamp: Date.now(),
      agent: this.name,
    });
    // Keep memory bounded
    if (this.memory.length > 100) {
      this.memory = this.memory.slice(-100);
    }
  }

  /**
   * Log with structured format
   */
  log(message, level = 'info') {
    const entry = {
      timestamp: Date.now(),
      agent: this.name,
      type: this.type,
      level,
      message,
    };
    this.logs.push(entry);
    this.emit('log', entry);
  }

  /**
   * Pause agent execution
   */
  pause() {
    if (this.state === 'running') {
      this.state = 'paused';
      this.log(`⏸️ Agent "${this.name}" paused`);
      this.emit('paused', { agent: this });
    }
  }

  /**
   * Resume agent execution
   */
  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.log(`▶️ Agent "${this.name}" resumed`);
      this.emit('resumed', { agent: this });
    }
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      name: this.name,
      type: this.type,
      state: this.state,
      duration: this.duration,
      memorySize: this.memory.length,
      logCount: this.logs.length,
    };
  }

  get duration() {
    if (!this.startTime) return 0;
    return (this.endTime || Date.now()) - this.startTime;
  }

  /**
   * Serialize agent state for persistence
   */
  serialize() {
    return {
      name: this.name,
      type: this.type,
      state: this.state,
      memory: this.memory,
      logs: this.logs,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  /**
   * Deserialize agent state
   */
  static deserialize(data, config, aiProvider) {
    const agent = new this(data.name, data.type, config, aiProvider);
    agent.state = data.state;
    agent.memory = data.memory || [];
    agent.logs = data.logs || [];
    agent.startTime = data.startTime;
    agent.endTime = data.endTime;
    return agent;
  }
}

module.exports = Agent;
