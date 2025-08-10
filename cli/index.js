#!/usr/bin/env node

/**
 * MCP-Helper Main Entry Point
 * Unified command router for all slash commands
 */

import { runCommand } from './router.js';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

// Run the command
runCommand(command, commandArgs).catch(error => {
  console.error('\x1b[31m✗\x1b[0m Fatal error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});