/**
 * MCP-Helper Slash Command Registry
 * 
 * This module provides slash command handlers for Claude Code.
 * These commands are executed within the Claude Code chat interface,
 * not as standalone CLI commands.
 */

import { ConfigManager } from '../lib/config-manager.js';
import { ServerCardsManager } from '../lib/server-cards.js';
import { ClaudeMdGenerator } from '../lib/claude-md-generator.js';

/**
 * Slash command registry
 * Maps command patterns to their handlers
 */
export class SlashCommandRegistry {
  constructor() {
    this.commands = new Map();
    this.configManager = new ConfigManager();
    this.serverCards = new ServerCardsManager();
    this.claudeMdGenerator = new ClaudeMdGenerator();
    
    // Initialize server cards
    this.initializeAsync();
    
    // Register all commands
    this.registerCommands();
  }
  
  async initializeAsync() {
    await this.serverCards.initialize();
  }

  /**
   * Register all available slash commands
   */
  registerCommands() {
    // Import and register each command
    this.register('init', () => import('./commands/init.js'));
    this.register('add', () => import('./commands/add.js'));
    this.register('list', () => import('./commands/list.js'));
    this.register('reconfigure', () => import('./commands/reconfigure.js'));
    this.register('add-custom', () => import('./commands/add-custom.js'));
    this.register('advisor', () => import('./commands/advisor.js'));
    this.register('help', () => import('./commands/help.js'));
  }

  /**
   * Register a command handler
   */
  register(name, importFn) {
    this.commands.set(name, {
      name,
      importFn,
      loaded: false,
      handler: null
    });
  }

  /**
   * Load a command handler dynamically
   */
  async loadCommand(name) {
    const command = this.commands.get(name);
    if (!command) {
      throw new Error(`Unknown command: ${name}`);
    }

    if (!command.loaded) {
      const module = await command.importFn();
      command.handler = module.default || module.handler;
      command.loaded = true;
    }

    return command.handler;
  }

  /**
   * Execute a slash command
   * @param {string} input - The full slash command input (e.g., "/mcp-helper add github")
   * @returns {Promise<Object>} - Command execution result
   */
  async execute(input) {
    // Parse the command
    const parsed = this.parseCommand(input);
    if (!parsed) {
      return {
        success: false,
        message: 'Invalid command format. Use: /mcp-helper <command> [options]'
      };
    }

    const { command, args } = parsed;

    try {
      // Load and execute the command handler
      const handler = await this.loadCommand(command);
      
      // Create context for the command
      const context = {
        configManager: this.configManager,
        serverCards: this.serverCards,
        claudeMdGenerator: this.claudeMdGenerator,
        args
      };

      // Execute the handler
      const result = await handler.execute(context);
      
      return {
        success: true,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        message: `Error executing command: ${error.message}`,
        error
      };
    }
  }

  /**
   * Parse a slash command input
   */
  parseCommand(input) {
    // Remove leading/trailing whitespace
    input = input.trim();

    // Check if it starts with /mcp-helper
    if (!input.startsWith('/mcp-helper')) {
      return null;
    }

    // Remove the prefix and split into parts
    const parts = input.substring('/mcp-helper'.length).trim().split(/\s+/);
    
    if (parts.length === 0 || parts[0] === '') {
      // Just "/mcp-helper" with no command - treat as help
      return { command: 'help', args: [] };
    }

    // First part is the command, rest are arguments
    const command = parts[0];
    const args = parts.slice(1);

    return { command, args };
  }

  /**
   * Get available commands for help/autocomplete
   */
  getAvailableCommands() {
    return Array.from(this.commands.keys()).map(name => ({
      name,
      pattern: `/mcp-helper ${name}`,
      description: this.getCommandDescription(name)
    }));
  }

  /**
   * Get command description
   */
  getCommandDescription(name) {
    const descriptions = {
      'init': 'Initialize MCP configuration for your project',
      'add': 'Add an MCP server from the catalog',
      'list': 'List all configured MCP servers',
      'reconfigure': 'Modify an existing server configuration',
      'add-custom': 'Add a custom MCP server not in the catalog',
      'help': 'Show available commands and usage'
    };
    return descriptions[name] || 'No description available';
  }
}

// Export singleton instance
export const slashCommands = new SlashCommandRegistry();

/**
 * Main entry point for Claude Code to execute slash commands
 * This function is called by Claude when it detects a /mcp-helper command
 */
export async function handleSlashCommand(input) {
  return await slashCommands.execute(input);
}