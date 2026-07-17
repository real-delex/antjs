/**
 * Custom Provider — Connect to ANY OpenAI-compatible API endpoint
 *
 * Examples:
 *   - OpenRouter: baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o'
 *   - Azure OpenAI: baseUrl: 'https://your-resource.openai.azure.com/openai/deployments/your-deployment', apiKey: '...'
 *   - Groq: baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b'
 *   - Together AI: baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.1-70B'
 *   - LM Studio: baseUrl: 'http://localhost:1234/v1', model: 'local-model' (auto-detected)
 *   - LocalAI / vLLM: baseUrl: 'http://localhost:8080/v1', model: 'your-model'
 */

const AIProvider = require('./AIProvider');
const axios = require('axios');

class CustomProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.providerName = 'custom';
    this.apiKey = config.get(['ai', 'apiKey']);
    this.baseUrl = config.get(['ai', 'baseUrl']);
    this.model = config.get(['ai', 'model']);

    if (!this.baseUrl) {
      throw new Error('Custom provider requires ai.baseUrl to be set.');
    }
    if (!this.model) {
      throw new Error('Custom provider requires ai.model to be set.');
    }
  }

  async complete(prompt, options = {}) {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  async chat(messages, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

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
        headers,
        timeout: options.timeout ?? 60000,
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Test connection with detailed diagnostics for local servers
   */
  async testConnection() {
    const isLocal = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');

    // Step 1: Check if server is reachable at all
    try {
      await axios.get(`${this.baseUrl}/models`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
        timeout: 5000,
      });
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: isLocal
            ? `Server not running at ${this.baseUrl}. Make sure LM Studio / Ollama / LocalAI server is started and listening.`
            : `Cannot connect to ${this.baseUrl}. Check your internet connection and baseUrl.`,
        };
      }
      // /models endpoint might not exist — that's ok, continue to chat test
    }

    // Step 2: Try a simple chat completion
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: 'Say "pong"' }],
          max_tokens: 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
          },
          timeout: 15000,
        }
      );

      return { success: true, response: response.data.choices[0].message.content.trim() };

    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      // LM Studio / local server: model not loaded
      if (status === 404 || data?.error?.includes?.('model') || data?.error?.includes?.('not found')) {
        return {
          success: false,
          error: `Model "${this.model}" is not loaded. In LM Studio: load the model first, then click "Start Server". In Ollama: run 'ollama pull ${this.model}'.`,
        };
      }

      // 401 Unauthorized
      if (status === 401) {
        return {
          success: false,
          error: `Invalid API key. Check your ai.apiKey in antjs.config.js or ${isLocal ? 'use any non-empty string for local servers' : 'get a valid key from your provider'}.`,
        };
      }

      // 500 or other server error
      if (status >= 500) {
        return {
          success: false,
          error: `Server error (${status}): ${data?.error?.message || err.message}. Try reloading the model or restarting the server.`,
        };
      }

      // Generic fallback
      return {
        success: false,
        error: `${err.message}${data?.error ? ` — ${JSON.stringify(data.error)}` : ''}`,
      };
    }
  }
}

module.exports = CustomProvider;
