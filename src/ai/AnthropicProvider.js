/**
 * Anthropic Provider — Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku support
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');

class AnthropicProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.providerName = 'anthropic';
    this.apiKey = config.get(['ai', 'apiKey']);
    this.baseUrl = config.get(['ai', 'baseUrl']) || 'https://api.anthropic.com/v1';
    this.model = config.get(['ai', 'model']) || 'claude-3-5-sonnet-20241022';

    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured. Set ai.apiKey in config or ANTHJS_AI_KEY env var.');
    }
  }

  async complete(prompt, options = {}) {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  async chat(messages, options = {}) {
    const response = await axios.post(
      `${this.baseUrl}/messages`,
      {
        model: this.model,
        messages,
        max_tokens: options.maxTokens ?? this.config.get(['ai', 'maxTokens']) ?? 4096,
        temperature: options.temperature ?? this.config.get(['ai', 'temperature']) ?? 0.3,
        ...options.extraParams,
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: options.timeout ?? 60000,
      }
    );

    return response.data.content[0].text;
  }
}

module.exports = AnthropicProvider;
