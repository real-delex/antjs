/**
 * Colony Logger — Pretty console output with chalk
 */

const chalk = require('chalk');

class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
  }

  info(msg) {
    console.log(chalk.blue('ℹ '), msg);
  }

  success(msg) {
    console.log(chalk.green('✔ '), msg);
  }

  warn(msg) {
    console.log(chalk.yellow('⚠ '), msg);
  }

  error(msg) {
    console.log(chalk.red('✖ '), msg);
  }

  agentLog(entry) {
    const colors = {
      scout: chalk.cyan,
      analyst: chalk.magenta,
      actor: chalk.green,
      healer: chalk.yellow,
      reporter: chalk.blue,
    };
    const color = colors[entry.type] || chalk.white;
    const prefix = color(`[${entry.agent}]`);
    console.log(`${prefix} ${entry.message}`);
  }

  colonyState(state) {
    console.log(chalk.bold(`\n🐜 Colony state: ${chalk.underline(state)}\n`));
  }
}

module.exports = Logger;
