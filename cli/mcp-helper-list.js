#!/usr/bin/env node
/**
 * /mcp-helper list - List configured MCP servers with status
 * This slash command is executed within Claude Code chat interface
 */

import { ConfigManager } from '../lib/config-manager.js';
import { ServerCardsManager } from '../lib/server-cards.js';
import chalk from 'chalk';
import Table from 'cli-table3';

async function list() {
  console.log(chalk.blue.bold('📋 MCP Helper - Configured Servers'));
  console.log();

  try {
    // Initialize managers
    const configManager = new ConfigManager();
    const serverCardsManager = new ServerCardsManager();
    await serverCardsManager.initialize();

    // Get configured servers
    const servers = await configManager.listServers();
    
    if (servers.length === 0) {
      console.log(chalk.yellow('No MCP servers configured yet.'));
      console.log();
      console.log('To add your first server, use:');
      console.log(chalk.cyan('  /mcp-helper add <server-name>'));
      console.log();
      
      // Show recommendations
      const essentials = serverCardsManager.getEssentialServers();
      
      if (essentials.forAgents.length > 0) {
        console.log('Recommended servers for AI agents:');
        for (const card of essentials.forAgents.slice(0, 3)) {
          console.log(`  • ${chalk.bold(card.id)}: ${card.name}`);
        }
      }
      
      return;
    }

    // Create table for display
    const table = new Table({
      head: [
        chalk.cyan('Server'),
        chalk.cyan('Scope'),
        chalk.cyan('Status'),
        chalk.cyan('Human'),
        chalk.cyan('Agent'),
        chalk.cyan('Missing Env')
      ],
      colWidths: [20, 12, 10, 8, 8, 30],
      wordWrap: true
    });

    // Get environment variables
    const projectEnv = await configManager.readProjectEnv();
    
    // Statistics
    let globalCount = 0;
    let projectCount = 0;
    let overrideCount = 0;
    let missingEnvCount = 0;
    
    // Process each server
    for (const server of servers) {
      const card = serverCardsManager.getCard(server.id);
      
      // Count by scope
      if (server.scope === 'global') globalCount++;
      if (server.scope === 'project') projectCount++;
      if (server.hasProjectOverrides) overrideCount++;
      
      // Check environment variables
      let status = chalk.green('✅');
      let missingVars = [];
      
      if (card) {
        const validation = serverCardsManager.validateEnvVars(card, projectEnv);
        if (!validation.valid) {
          status = chalk.yellow('⚠️');
          missingVars = validation.missing.map(v => v.name);
          missingEnvCount++;
        }
      }
      
      // Get ratings
      const humanRating = card?.agenticUsefulness?.humanVerificationRating || '?';
      const agentRating = card?.agenticUsefulness?.aiAgentRating || '?';
      
      // Determine scope display
      let scopeDisplay = server.scope;
      if (server.hasProjectOverrides) {
        scopeDisplay = chalk.blue('override');
      }
      
      // Add to table
      table.push([
        chalk.bold(server.id),
        scopeDisplay,
        status,
        `${humanRating}/5`,
        `${agentRating}/5`,
        missingVars.join(', ') || chalk.gray('—')
      ]);
    }

    // Display table
    console.log(table.toString());
    console.log();

    // Display statistics
    console.log(chalk.cyan('📊 Summary:'));
    console.log(`  Total servers: ${servers.length}`);
    console.log(`  Global scope: ${globalCount}`);
    console.log(`  Project scope: ${projectCount}`);
    console.log(`  Project overrides: ${overrideCount}`);
    
    if (missingEnvCount > 0) {
      console.log(`  ${chalk.yellow(`Missing env vars: ${missingEnvCount} server(s)`)}`);
    }
    console.log();

    // Group by runtime
    const byRuntime = {};
    for (const server of servers) {
      const card = serverCardsManager.getCard(server.id);
      if (card) {
        const runtime = card.runtime || 'unknown';
        if (!byRuntime[runtime]) byRuntime[runtime] = [];
        byRuntime[runtime].push(server.id);
      }
    }
    
    console.log(chalk.cyan('🏃 By Runtime:'));
    for (const [runtime, serverIds] of Object.entries(byRuntime)) {
      console.log(`  ${runtime}: ${serverIds.join(', ')}`);
    }
    console.log();

    // Show essential servers not yet configured
    const essentials = serverCardsManager.getEssentialServers();
    const configuredIds = new Set(servers.map(s => s.id));
    
    const missingEssentialAgents = essentials.forAgents.filter(
      card => !configuredIds.has(card.id)
    );
    
    const missingEssentialHumans = essentials.forHumans.filter(
      card => !configuredIds.has(card.id)
    );
    
    if (missingEssentialAgents.length > 0 || missingEssentialHumans.length > 0) {
      console.log(chalk.cyan('💡 Recommended servers not yet configured:'));
      
      if (missingEssentialAgents.length > 0) {
        console.log('  For AI Agents:');
        for (const card of missingEssentialAgents.slice(0, 3)) {
          console.log(`    • ${chalk.bold(card.id)} (Agent: ${card.agenticUsefulness.aiAgentRating}/5)`);
        }
      }
      
      if (missingEssentialHumans.length > 0) {
        console.log('  For Human Verification:');
        for (const card of missingEssentialHumans.slice(0, 3)) {
          console.log(`    • ${chalk.bold(card.id)} (Human: ${card.agenticUsefulness.humanVerificationRating}/5)`);
        }
      }
      console.log();
    }

    // Show next steps
    if (missingEnvCount > 0) {
      console.log(chalk.yellow('⚠️  Some servers are missing environment variables.'));
      console.log('   Configure them in your .env file or use:');
      console.log(chalk.cyan('   /mcp-helper reconfigure <server-name>'));
      console.log();
    }
    
    console.log('Commands:');
    console.log('  Add server: ' + chalk.cyan('/mcp-helper add <server-name>'));
    console.log('  Reconfigure: ' + chalk.cyan('/mcp-helper reconfigure <server-name>'));
    console.log('  View docs: ' + chalk.cyan('cat CLAUDE.md'));

  } catch (error) {
    console.error(chalk.red('❌ Error listing servers:'), error.message);
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// Run the list command
list().catch(console.error);