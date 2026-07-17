/**
 * OpenRouter Provider — Access 200+ AI models through one API
 * Supports: Claude, GPT-4, Llama, Mistral, Gemini, and many more
 * Get key: https://openrouter.ai/keys
 * Docs: https://openrouter.ai/docs
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');

class OpenRouterProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.providerName = 'openrouter';
    this.apiKey = config.get(['ai', 'apiKey']);
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.model = config.get(['ai', 'model']) || 'openai/gpt-4o';

    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured. Get one at https://openrouter.ai/keys');
    }
  }

  async complete(prompt, options = {}) {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  async chat(messages, options = {}) {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages,
        temperature: options.temperature ?? this.config.get(['ai', 'temperature']) ?? 0.3,
        max_tokens: options.maxTokens ?? this.config.get(['ai', 'maxTokens']) ?? 4096,
        ...options.extraParams,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/antjs',
          'X-Title': 'Ant.js Test Colony',
        },
        timeout: options.timeout ?? 60000,
      }
    );

    return response.data.choices[0].message.content;
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/auth/key`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 10000,
      });
      return { success: true, response: `Key valid — ${response.data.data?.label || 'OpenRouter'}` };
    } catch (err) {
      if (err.response?.status === 401) {
        return { success: false, error: 'Invalid OpenRouter API key. Get a valid one at https://openrouter.ai/keys' };
      }
      return { success: false, error: `OpenRouter error: ${err.message}` };
    }
  }

  async listModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 10000,
      });
      return response.data.data.map(m => ({
        id: m.id,
        name: m.name,
        pricing: m.pricing,
      }));
    } catch (error) {
      throw new Error(`Failed to list OpenRouter models: ${error.message}`);
    }
  }
}

module.exports = OpenRouterProvider;
