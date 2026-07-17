#!/usr/bin/env node

/**
 * Ant.js CLI — Command line interface for the colony
 */

const { Command } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const AntJS = require('../src/index');
const Logger = require('../src/utils/logger');
const packageJson = require('../package.json');

const program = new Command();
const logger = new Logger();

program
  .name('antjs')
  .description('🐜 Self-Healing Test Colony')
  .version(packageJson.version);

// Init command
program
  .command('init')
  .description('Initialize a new Ant.js colony in current directory')
  .action(async () => {
    console.log(chalk.bold('🐜 Welcome to Ant.js! Let\'s set up your colony.\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Target URL to test:',
        default: 'http://localhost:3000',
      },
      {
        type: 'list',
        name: 'provider',
        message: 'Choose AI provider:',
        choices: ['openai', 'anthropic', 'ollama', 'openrouter', 'custom'],
        default: 'openai',
      },
      {
        type: 'input',
        name: 'model',
        message: 'Model name:',
        default: (answers) => {
          const defaults = { openai: 'gpt-4o', anthropic: 'claude-3-5-sonnet-20241022', ollama: 'llama3.1', openrouter: 'openai/gpt-4o', custom: 'custom-model' };
          return defaults[answers.provider];
        },
      },
      {
        type: 'input',
        name: 'apiKey',
        message: 'API Key (leave blank for Ollama):',
        when: (answers) => answers.provider !== 'ollama',
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Base URL (for custom/Ollama):',
        when: (answers) => answers.provider === 'custom' || answers.provider === 'ollama',
        default: (answers) => answers.provider === 'ollama' ? 'http://localhost:11434' : '',
      },
    ]);

    const configContent = `module.exports = {
  ai: {
    provider: '${answers.provider}',
    model: '${answers.model}',
    ${answers.apiKey ? `apiKey: '${answers.apiKey}',` : ''}
    ${answers.baseUrl ? `baseUrl: '${answers.baseUrl}',` : ''}
  },
  test: {
    url: '${answers.url}',
    depth: 2,
  },
  report: {
    outputDir: './antjs-reports',
  },
};
`;

    fs.writeFileSync('antjs.config.js', configContent);
    console.log(chalk.green('✅ Created antjs.config.js'));
    console.log(chalk.gray('Run `npx antjs run` to start testing.'));
  });

// Run command
program
  .command('run')
  .description('Run the test colony')
  .option('-u, --url <url>', 'Target URL')
  .option('-p, --provider <provider>', 'AI provider')
  .option('-k, --key <key>', 'API Key')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--no-headless', 'Show browser window')
  .action(async (options) => {
    try {
      const colony = await AntJS.create({
        url: options.url,
        ai: {
          provider: options.provider,
          apiKey: options.key,
        },
        colony: {
          headless: options.headless,
        },
      });

      colony.on('log', (entry) => {
        if (entry.source === 'Colony') {
          logger.info(entry.message);
        } else {
          logger.agentLog(entry);
        }
      });

      colony.on('started', () => logger.colonyState('RUNNING'));
      colony.on('completed', ({ results }) => {
        logger.success(`Colony completed! Report: ${results.reporter?.htmlPath || 'N/A'}`);
        process.exit(0);
      });
      colony.on('error', ({ error }) => {
        logger.error(`Colony failed: ${error.message}`);
        process.exit(1);
      });

      await colony.initialize();
      await colony.run(colony.config.get(['test', 'url']));

    } catch (error) {
      logger.error(error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check AI provider connection')
  .action(async () => {
    try {
      const colony = await AntJS.create();
      const ai = colony.ai;
      const test = await ai.testConnection();

      if (test.success) {
        logger.success(`AI provider "${colony.config.get(['ai', 'provider'])}" is online! Response: ${test.response}`);
      } else {
        logger.error(`Connection failed: ${test.error}`);
      }
      process.exit(0);
    } catch (error) {
      logger.error(error.message);
      process.exit(1);
    }
  });

program.parse();
