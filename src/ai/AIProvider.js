/**
 * Base AI Provider — abstract interface for all AI backends
 * Supports: OpenAI, Anthropic, Ollama, and custom HTTP endpoints
 */

class AIProvider {
  constructor(config) {
    this.config = config;
    this.providerName = 'base';
  }

  /**
   * Send a completion request to the AI
   * @param {string} prompt - The prompt text
   * @param {Object} options - Additional options (temperature, maxTokens, etc.)
   * @returns {Promise<string>} - The AI response text
   */
  async complete(prompt, options = {}) {
    throw new Error('complete() must be implemented by subclass');
  }

  /**
   * Send a chat completion with message history
   * @param {Array} messages - Array of {role, content} objects
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - The AI response text
   */
  async chat(messages, options = {}) {
    throw new Error('chat() must be implemented by subclass');
  }

  /**
   * Structured output: request JSON response
   * @param {string} prompt - The prompt
   * @param {Object} schema - Expected JSON schema (for validation hints)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Parsed JSON object
   */
  async structured(prompt, schema = null, options = {}) {
    const jsonPrompt = schema 
      ? `${prompt}\n\nRespond ONLY with valid JSON matching this schema: ${JSON.stringify(schema)}`
      : `${prompt}\n\nRespond ONLY with valid JSON.`;

    const response = await this.complete(jsonPrompt, {
      ...options,
      temperature: options.temperature ?? 0.1, // Lower temp for structured output
    });

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
      return JSON.parse(jsonStr);
    } catch (err) {
      throw new Error(`Failed to parse structured output: ${err.message}\nRaw response: ${response}`);
    }
  }

  /**
   * Test connection to the AI provider
   */
  async testConnection() {
    try {
      const response = await this.complete('Say "pong"', { maxTokens: 10 });
      return { success: true, response: response.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Factory method to create the right provider from config
   */
  static create(config) {
    const providerName = config.get(['ai', 'provider']);

    switch (providerName) {
      case 'openai':
        return new (require('./OpenAIProvider'))(config);
      case 'anthropic':
        return new (require('./AnthropicProvider'))(config);
      case 'ollama':
        return new (require('./OllamaProvider'))(config);
      case 'openrouter':
        return new (require('./OpenRouterProvider'))(config);
      case 'custom':
        return new (require('./CustomProvider'))(config);
      default:
        throw new Error(`Unknown AI provider: ${providerName}. Supported: openai, anthropic, ollama, openrouter, custom`);
    }
  }
}

module.exports = AIProvider;
