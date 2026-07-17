/**
 * Ant.js — Main entry point (programmatic API)
 */

const Config = require('./core/Config');
const Colony = require('./core/Colony');
const AIProvider = require('./ai/AIProvider');

class AntJS {
  static async create(options = {}) {
    const config = new Config(options);
    const ai = AIProvider.create(config);

    const test = await ai.testConnection();
    if (!test.success) {
      console.error(`\n❌ AI CONNECTION FAILED`);
      console.error(`   ${test.error}`);
      console.error(`\n   💡 Tips:`);
      console.error(`      • Check that the AI server is running`);
      console.error(`      • Verify your API key in antjs.config.js or env vars`);
      console.error(`      • For local servers (LM Studio, Ollama), make sure the model is loaded`);
      console.error(`      • Check baseUrl in config — it should end with /v1, not /v1/chat/completions\n`);
      throw new Error(`AI provider "${config.get(['ai', 'provider'])}" is not reachable.`);
    } else {
      console.log(`🤖 AI connected (${config.get(['ai', 'provider'])}) — ${test.response}`);
    }

    const colony = new Colony(config, ai);
    return colony;
  }
}

module.exports = AntJS;
