/**
 * Configuration manager for Ant.js Colony
 * Supports: config file, env vars, CLI args
 */

const fs = require('fs');
const path = require('path');

class Config {
  constructor(options = {}) {
    this.options = {
      // Default colony settings
      colony: {
        maxAgents: 5,
        parallelAgents: 3,
        timeout: 30000,
        retries: 2,
        headless: true,
        slowMo: 0,
        viewport: { width: 1280, height: 720 },
        ...options.colony,
      },
      // AI Provider settings
      ai: {
        provider: 'openai', // openai | anthropic | ollama | custom
        model: 'gpt-4o',
        apiKey: process.env.ANTJS_AI_KEY || process.env.OPENAI_API_KEY,
        baseUrl: null, // for custom endpoints
        temperature: 0.3,
        maxTokens: 4096,
        ...options.ai,
      },
      // Browser settings
      browser: {
        type: 'chromium', // chromium | firefox | webkit
        launchOptions: {},
        ...options.browser,
      },
      // Test settings
      test: {
        url: options.url || 'http://localhost:3000',
        entryPoint: 'body',
        depth: 3,
        includePatterns: [],
        excludePatterns: ['/admin', '/logout'],
        ...options.test,
      },
      // Reporting
      report: {
        outputDir: './antjs-reports',
        format: 'html', // html | json | junit
        saveScreenshots: true,
        saveVideos: true,
        ...options.report,
      },
    };

    this._loadConfigFile();
    this._loadEnvVars();
  }

  _loadConfigFile() {
    const configPaths = [
      './antjs.config.js',
      './antjs.config.json',
      './config/antjs.config.js',
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        const ext = path.extname(configPath);
        try {
          if (ext === '.json') {
            const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.merge(fileConfig);
          } else {
            // Require JS config
            delete require.cache[require.resolve(path.resolve(configPath))];
            const fileConfig = require(path.resolve(configPath));
            this.merge(fileConfig);
          }
          break;
        } catch (err) {
          console.warn(`⚠️  Failed to load config from ${configPath}: ${err.message}`);
        }
      }
    }
  }

  _loadEnvVars() {
    // ANTJS_AI_PROVIDER, ANTJS_AI_MODEL, ANTJS_AI_KEY, etc.
    const envMappings = {
      ANTJS_AI_PROVIDER: ['ai', 'provider'],
      ANTJS_AI_MODEL: ['ai', 'model'],
      ANTJS_AI_KEY: ['ai', 'apiKey'],
      ANTJS_AI_BASE_URL: ['ai', 'baseUrl'],
      ANTJS_BROWSER_TYPE: ['browser', 'type'],
      ANTJS_TEST_URL: ['test', 'url'],
      ANTJS_REPORT_DIR: ['report', 'outputDir'],
    };

    for (const [envVar, pathArr] of Object.entries(envMappings)) {
      if (process.env[envVar]) {
        this.set(pathArr, process.env[envVar]);
      }
    }
  }

  get(path) {
    return path.reduce((obj, key) => obj?.[key], this.options);
  }

  set(path, value) {
    let target = this.options;
    for (let i = 0; i < path.length - 1; i++) {
      if (!target[path[i]]) target[path[i]] = {};
      target = target[path[i]];
    }
    target[path[path.length - 1]] = value;
  }

  merge(newConfig) {
    const deepMerge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };
    deepMerge(this.options, newConfig);
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this.options));
  }
}

module.exports = Config;
