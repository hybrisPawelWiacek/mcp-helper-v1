#!/usr/bin/env node

/**
 * Command Router
 * Central dispatcher for all mcp-helper slash commands
 */

import { InitCommand } from './commands/init.js';
import { AddCommand } from './commands/add.js';
import { ListCommand } from './commands/list.js';
import { ReconfigureCommand } from './commands/reconfigure.js';
import { AddCustomCommand } from './commands/add-custom.js';

export class CommandRouter {
  constructor() {
    this.commands = new Map();
    this.registerCommands();
  }

  registerCommands() {
    // Register all available commands
    this.register(new InitCommand());
    this.register(new AddCommand());
    this.register(new ListCommand());
    this.register(new ReconfigureCommand());
    this.register(new AddCustomCommand());
  }

  register(command) {
    this.commands.set(command.name, command);
    // Register aliases if they exist
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.commands.set(alias, command);
      });
    }
  }

  async route(commandName, args = []) {
    // Special case for help
    if (!commandName || commandName === 'help' || commandName === '--help' || commandName === '-h') {
      this.showHelp();
      return;
    }

    // Find and execute command
    const command = this.commands.get(commandName);
    if (!command) {
      console.error(`\x1b[31m✗\x1b[0m Unknown command: ${commandName}`);
      console.log(`\x1b[33m💡\x1b[0m Did you mean one of these?`);
      this.suggestCommands(commandName);
      console.log(`\nRun '/mcp-helper help' to see all available commands.`);
      process.exit(1);
    }

    await command.run(args);
  }

  suggestCommands(input) {
    const suggestions = [];
    const lowerInput = input.toLowerCase();
    
    // Get unique commands (not aliases)
    const uniqueCommands = new Set();
    this.commands.forEach((command, name) => {
      if (name === command.name) {
        uniqueCommands.add(command);
      }
    });

    uniqueCommands.forEach(command => {
      const lowerName = command.name.toLowerCase();
      // Simple similarity check
      if (lowerName.includes(lowerInput) || lowerInput.includes(lowerName)) {
        suggestions.push(command.name);
      }
    });

    if (suggestions.length > 0) {
      suggestions.forEach(s => console.log(`  • ${s}`));
    } else {
      uniqueCommands.forEach(command => {
        console.log(`  • ${command.name}`);
      });
    }
  }

  showHelp() {
    console.log(`
\x1b[36m🚀 MCP-Helper\x1b[0m
\x1b[90mSlash command extension for Claude Code CLI to manage MCP server configurations\x1b[0m

\x1b[33mUsage:\x1b[0m
  /mcp-helper <command> [options]

\x1b[33mAvailable Commands:\x1b[0m`);

    // Get unique commands
    const uniqueCommands = new Map();
    this.commands.forEach((command, name) => {
      if (name === command.name) {
        uniqueCommands.set(name, command);
      }
    });

    // Display commands with descriptions
    uniqueCommands.forEach(command => {
      const aliases = command.aliases ? ` (${command.aliases.join(', ')})` : '';
      console.log(`  \x1b[36m${command.name.padEnd(15)}\x1b[0m ${command.description}${aliases}`);
    });

    console.log(`
\x1b[33mExamples:\x1b[0m
  /mcp-helper init                    Initialize project with MCP configuration
  /mcp-helper add github              Add GitHub MCP server interactively
  /mcp-helper list                    Show all configured servers
  /mcp-helper reconfigure serena      Modify Serena server configuration
  /mcp-helper add-custom              Add a custom MCP server

\x1b[33mOptions:\x1b[0m
  --help, -h    Show help for a specific command

\x1b[90mFor more information, visit: https://github.com/hybrisPawelWiacek/mcp-helper\x1b[0m
`);
  }
}

// Main entry point
export async function runCommand(commandName, args) {
  const router = new CommandRouter();
  await router.route(commandName, args);
}