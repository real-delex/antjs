/**
 * OpenAI Provider — GPT-4, GPT-4o, GPT-3.5-turbo support
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');

class OpenAIProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.providerName = 'openai';
    this.apiKey = config.get(['ai', 'apiKey']);
    this.baseUrl = config.get(['ai', 'baseUrl']) || 'https://api.openai.com/v1';
    this.model = config.get(['ai', 'model']) || 'gpt-4o';

    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Set ai.apiKey in config or ANTHJS_AI_KEY env var.');
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
        top_p: options.topP ?? 1,
        ...options.extraParams,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: options.timeout ?? 60000,
      }
    );

    return response.data.choices[0].message.content;
  }
}

module.exports = OpenAIProvider;
