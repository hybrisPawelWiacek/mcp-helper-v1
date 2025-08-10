#!/usr/bin/env node
/**
 * /mcp-helper reconfigure - Modify existing MCP server configuration
 * This slash command is executed within Claude Code chat interface
 */

import { ConfigManager } from '../lib/config-manager.js';
import { ServerCardsManager } from '../lib/server-cards.js';
import { ClaudeMdGenerator } from '../lib/claude-md-generator.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

/**
 * Mask sensitive value for display
 */
function maskValue(value) {
  if (!value || value.length <= 4) {
    return '***';
  }
  return value.substring(0, 2) + '***' + value.substring(value.length - 2);
}

async function reconfigure(serverName) {
  console.log(chalk.blue.bold('🔧 MCP Helper - Reconfigure Server'));
  console.log();

  try {
    // Initialize managers
    const configManager = new ConfigManager();
    const serverCardsManager = new ServerCardsManager();
    await serverCardsManager.initialize();
    
    const claudeMdGenerator = new ClaudeMdGenerator(configManager, serverCardsManager);

    // Step 1: Select server to reconfigure
    let selectedServer = serverName;
    
    if (!selectedServer) {
      // Get list of configured servers
      const servers = await configManager.listServers();
      
      if (servers.length === 0) {
        console.log(chalk.yellow('No servers configured yet.'));
        console.log('Use ' + chalk.cyan('/mcp-helper add <server>') + ' to add servers first.');
        return;
      }
      
      // Create choices with ratings
      const choices = servers.map(server => {
        const card = serverCardsManager.getCard(server.id);
        const humanRating = card?.agenticUsefulness?.humanVerificationRating || '?';
        const agentRating = card?.agenticUsefulness?.aiAgentRating || '?';
        const scopeIcon = server.hasProjectOverrides ? '🔄' : (server.scope === 'global' ? '🌍' : '📁');
        
        return {
          name: `${scopeIcon} ${card?.name || server.id} (Human: ${humanRating}/5, Agent: ${agentRating}/5)`,
          value: server.id,
          short: server.id
        };
      });
      
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'server',
          message: 'Select a server to reconfigure:',
          choices,
          pageSize: 15
        }
      ]);
      
      selectedServer = answer.server;
    }

    // Step 2: Get current configuration
    const serverConfig = await configManager.getServerConfig(selectedServer);
    
    if (!serverConfig) {
      console.error(chalk.red(`❌ Server '${selectedServer}' is not configured`));
      console.log('Use ' + chalk.cyan(`/mcp-helper add ${selectedServer}`) + ' to add it first.');
      return;
    }
    
    const serverCard = serverCardsManager.getCard(selectedServer);
    
    // Step 3: Display current configuration
    console.log();
    console.log(chalk.cyan('📋 Current Configuration'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`Server: ${chalk.bold(serverCard?.name || selectedServer)}`);
    console.log(`Scope: ${serverConfig.hasProjectOverrides ? chalk.blue('project override') : serverConfig.scope}`);
    
    // Show agentic usefulness
    if (serverCard?.agenticUsefulness) {
      console.log(`Human Verification: ${serverCard.agenticUsefulness.humanVerificationRating}/5`);
      console.log(`AI Agent Use: ${serverCard.agenticUsefulness.aiAgentRating}/5`);
    }
    
    // Show environment variables
    console.log();
    console.log(chalk.cyan('Environment Variables:'));
    
    const requiredEnvVars = serverCardsManager.getRequiredEnvVars(serverCard);
    const optionalEnvVars = serverCardsManager.getOptionalEnvVars(serverCard);
    const allEnvVars = [...requiredEnvVars, ...optionalEnvVars];
    
    if (allEnvVars.length === 0) {
      console.log(chalk.gray('  No environment variables required'));
    } else {
      for (const envVar of allEnvVars) {
        const value = serverConfig.envVars[envVar.name];
        const isRequired = requiredEnvVars.includes(envVar);
        const status = value ? chalk.green('✓') : (isRequired ? chalk.red('✗') : chalk.yellow('○'));
        const displayValue = value ? maskValue(value) : chalk.gray('not set');
        
        console.log(`  ${status} ${envVar.name}: ${displayValue}`);
      }
    }
    
    console.log(chalk.gray('━'.repeat(50)));
    console.log();

    // Step 4: Present reconfiguration options
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔐 Update environment variables', value: 'env' },
          { name: '🔄 Change scope (global ↔ project)', value: 'scope' },
          { name: '🗑️  Remove server', value: 'remove' },
          { name: '↩️  Cancel', value: 'cancel' }
        ]
      }
    ]);

    if (action === 'cancel') {
      console.log(chalk.yellow('Cancelled'));
      return;
    }

    // Step 5: Handle selected action
    switch (action) {
      case 'env':
        await handleEnvUpdate(configManager, serverConfig, serverCard, allEnvVars);
        break;
        
      case 'scope':
        await handleScopeChange(configManager, serverConfig, serverCard);
        break;
        
      case 'remove':
        await handleRemoval(configManager, serverCardsManager, serverConfig, serverCard);
        break;
    }

    // Step 6: Update CLAUDE.md
    console.log();
    console.log(chalk.yellow('📄 Updating CLAUDE.md...'));
    await claudeMdGenerator.generate();
    console.log(chalk.green('✓ Updated CLAUDE.md'));

    // Step 7: Show success and next steps
    console.log();
    console.log(chalk.green.bold('✅ Reconfiguration complete!'));
    console.log();
    console.log('Next steps:');
    console.log('1. Restart Claude Code to apply changes');
    console.log('2. Verify with: ' + chalk.cyan('/mcp list'));
    
    // Show backup location
    const backupDir = path.join(process.env.HOME, '.mcp-helper', 'backups');
    console.log();
    console.log(chalk.gray(`Backups stored in: ${backupDir}`));
    console.log(chalk.gray('To undo changes, restore from the latest backup'));

  } catch (error) {
    console.error(chalk.red('❌ Error during reconfiguration:'), error.message);
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

/**
 * Handle environment variable updates
 */
async function handleEnvUpdate(configManager, serverConfig, serverCard, allEnvVars) {
  console.log();
  console.log(chalk.cyan('🔐 Update Environment Variables'));
  console.log();
  
  // Select which variables to update
  const choices = allEnvVars.map(envVar => {
    const currentValue = serverConfig.envVars[envVar.name];
    const displayValue = currentValue ? maskValue(currentValue) : 'not set';
    
    return {
      name: `${envVar.name} (current: ${displayValue})`,
      value: envVar.name,
      checked: !currentValue // Pre-select missing vars
    };
  });
  
  const { varsToUpdate } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'varsToUpdate',
      message: 'Select variables to update:',
      choices
    }
  ]);
  
  if (varsToUpdate.length === 0) {
    console.log(chalk.yellow('No variables selected'));
    return;
  }
  
  // Get new values
  const newEnvVars = {};
  
  for (const varName of varsToUpdate) {
    const envVar = allEnvVars.find(v => v.name === varName);
    const currentValue = serverConfig.envVars[varName];
    
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message: `${varName}${currentValue ? ' (leave blank to keep current)' : ''}:`,
        default: envVar.example || '',
        validate: input => {
          if (!input && !currentValue && envVar.required !== false) {
            return 'This field is required';
          }
          return true;
        }
      }
    ]);
    
    if (value) {
      newEnvVars[varName] = value;
    }
  }
  
  // Apply updates
  if (Object.keys(newEnvVars).length > 0) {
    console.log();
    console.log(chalk.yellow('💾 Updating environment variables...'));
    await configManager.updateServerEnvVars(serverConfig.id, newEnvVars);
    console.log(chalk.green('✓ Environment variables updated'));
  }
}

/**
 * Handle scope change
 */
async function handleScopeChange(configManager, serverConfig, serverCard) {
  console.log();
  console.log(chalk.cyan('🔄 Change Scope'));
  console.log();
  
  const currentScope = serverConfig.hasProjectOverrides ? 'project override' : serverConfig.scope;
  console.log(`Current scope: ${chalk.bold(currentScope)}`);
  console.log();
  
  const { newScope } = await inquirer.prompt([
    {
      type: 'list',
      name: 'newScope',
      message: 'Select new scope:',
      choices: [
        { name: 'Global (all projects)', value: 'global' },
        { name: 'Project-specific (this project only)', value: 'project' }
      ]
    }
  ]);
  
  if (newScope === serverConfig.scope && !serverConfig.hasProjectOverrides) {
    console.log(chalk.yellow('No change needed'));
    return;
  }
  
  // Confirm the change
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Change scope from ${currentScope} to ${newScope}?`,
      default: true
    }
  ]);
  
  if (!confirm) {
    console.log(chalk.yellow('Cancelled'));
    return;
  }
  
  console.log();
  console.log(chalk.yellow('💾 Updating scope...'));
  await configManager.updateServerScope(serverConfig.id, newScope);
  console.log(chalk.green(`✓ Scope changed to ${newScope}`));
  
  if (newScope === 'global') {
    console.log(chalk.gray('Note: Environment variables remain in .env for reference'));
  }
}

/**
 * Handle server removal
 */
async function handleRemoval(configManager, serverCardsManager, serverConfig, serverCard) {
  console.log();
  console.log(chalk.red.bold('⚠️  Remove Server'));
  console.log();
  
  // Check if essential
  const isEssential = await configManager.isEssentialServer(serverConfig.id, serverCardsManager);
  
  if (isEssential) {
    console.log(chalk.yellow('⚠️  This is an essential server with high agentic usefulness!'));
    
    if (serverCard?.agenticUsefulness) {
      const { humanVerificationRating, aiAgentRating } = serverCard.agenticUsefulness;
      console.log(`   Human Verification: ${humanVerificationRating}/5`);
      console.log(`   AI Agent Use: ${aiAgentRating}/5`);
    }
    
    // Show integration impact
    if (serverCard?.agenticUsefulness?.integrationSynergies?.length > 0) {
      console.log();
      console.log('Removing this server may impact:');
      for (const synergy of serverCard.agenticUsefulness.integrationSynergies.slice(0, 3)) {
        console.log(chalk.gray(`  • ${synergy}`));
      }
    }
    console.log();
  }
  
  // Double confirmation
  const { confirm1 } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm1',
      message: `Are you sure you want to remove '${serverCard?.name || serverConfig.id}'?`,
      default: false
    }
  ]);
  
  if (!confirm1) {
    console.log(chalk.yellow('Cancelled'));
    return;
  }
  
  const { confirm2 } = await inquirer.prompt([
    {
      type: 'input',
      name: 'confirm2',
      message: `Type the server name '${serverConfig.id}' to confirm removal:`,
      validate: input => input === serverConfig.id || 'Server name does not match'
    }
  ]);
  
  // Remove the server
  console.log();
  console.log(chalk.yellow('💾 Removing server...'));
  
  // Create backup first
  const globalConfigPath = path.join(process.env.HOME, '.claude.json');
  const backupPath = await configManager.backupConfig(globalConfigPath);
  
  await configManager.removeServer(serverConfig.id);
  
  console.log(chalk.green(`✓ Server '${serverConfig.id}' removed`));
  console.log(chalk.gray(`Backup created: ${backupPath}`));
  console.log(chalk.gray('Note: Environment variables remain in .env for reference'));
}

// Parse command line arguments
const args = process.argv.slice(2);
const serverName = args[0];

// Run the reconfigure command
reconfigure(serverName).catch(console.error);