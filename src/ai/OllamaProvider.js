/**
 * Ollama Provider — Local AI models (Llama, Mistral, CodeLlama, etc.)
 * Perfect for self-hosted, privacy-first testing
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');

class OllamaProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.providerName = 'ollama';
    this.baseUrl = config.get(['ai', 'baseUrl']) || 'http://localhost:11434';
    this.model = config.get(['ai', 'model']) || 'llama3.1';
  }

  async complete(prompt, options = {}) {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  async chat(messages, options = {}) {
    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? this.config.get(['ai', 'temperature']) ?? 0.3,
          num_predict: options.maxTokens ?? this.config.get(['ai', 'maxTokens']) ?? 4096,
          ...options.extraParams,
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: options.timeout ?? 120000, // Local models can be slower
      }
    );

    return response.data.message.content;
  }

  /**
   * List available local models
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 10000 });
      return response.data.models.map(m => m.name);
    } catch (error) {
      throw new Error(`Failed to list Ollama models: ${error.message}. Is Ollama running?`);
    }
  }
}

module.exports = OllamaProvider;
