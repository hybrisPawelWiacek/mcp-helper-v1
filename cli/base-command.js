#!/usr/bin/env node

/**
 * Base Command Class
 * Provides shared functionality for all mcp-helper slash commands
 */

export class BaseCommand {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.colors = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m'
    };
  }

  // Color output helpers
  success(message) {
    console.log(`${this.colors.green}✓${this.colors.reset} ${message}`);
  }

  error(message) {
    console.error(`${this.colors.red}✗${this.colors.reset} ${message}`);
  }

  warning(message) {
    console.log(`${this.colors.yellow}⚠${this.colors.reset} ${message}`);
  }

  info(message) {
    console.log(`${this.colors.blue}ℹ${this.colors.reset} ${message}`);
  }

  dim(message) {
    console.log(`${this.colors.gray}${message}${this.colors.reset}`);
  }

  // Progress indicator
  startProgress(message) {
    process.stdout.write(`${this.colors.cyan}⏳${this.colors.reset} ${message}...`);
  }

  endProgress(success = true) {
    process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear line
    if (success) {
      this.success('Done!');
    }
  }

  // Parse arguments helper
  parseArgs(args) {
    const parsed = {
      _: [],
      flags: {}
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          parsed.flags[key] = nextArg;
          i++;
        } else {
          parsed.flags[key] = true;
        }
      } else if (arg.startsWith('-')) {
        const key = arg.slice(1);
        parsed.flags[key] = true;
      } else {
        parsed._.push(arg);
      }
    }

    return parsed;
  }

  // Help display
  showHelp() {
    console.log(`
${this.colors.cyan}${this.name}${this.colors.reset}
${this.colors.gray}${this.description}${this.colors.reset}

${this.getUsage()}

${this.colors.yellow}Options:${this.colors.reset}
  --help, -h    Show this help message

${this.getExamples()}
`);
  }

  // Override these in subclasses
  getUsage() {
    return `Usage: /mcp-helper ${this.name} [options]`;
  }

  getExamples() {
    return '';
  }

  // Main execution method - override in subclasses
  async execute(args) {
    throw new Error(`Execute method not implemented for ${this.name}`);
  }

  // Run command with error handling
  async run(args = []) {
    try {
      const parsed = this.parseArgs(args);
      
      if (parsed.flags.help || parsed.flags.h) {
        this.showHelp();
        return;
      }

      await this.execute(parsed);
    } catch (error) {
      this.error(`Command failed: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}