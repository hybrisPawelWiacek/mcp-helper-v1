#!/usr/bin/env node
/**
 * /mcp-helper add - Add a new MCP server to configuration
 * This slash command is executed within Claude Code chat interface
 */

import { ConfigManager } from '../lib/config-manager.js';
import { ServerCardsManager } from '../lib/server-cards.js';
import { ClaudeMdGenerator } from '../lib/claude-md-generator.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

async function add(serverName) {
  console.log(chalk.blue.bold('🚀 MCP Helper - Adding MCP Server'));
  console.log();

  try {
    // Initialize managers
    const configManager = new ConfigManager();
    const serverCardsManager = new ServerCardsManager();
    await serverCardsManager.initialize();
    
    const claudeMdGenerator = new ClaudeMdGenerator(configManager, serverCardsManager);

    // Step 1: Determine which server to add
    let selectedServer = serverName;
    
    if (!selectedServer) {
      // Show available servers with ratings
      const activeCards = serverCardsManager.getActiveCards();
      const essentials = serverCardsManager.getEssentialServers();
      
      // Create choices with ratings
      const choices = activeCards.map(card => {
        const humanRating = card.agenticUsefulness?.humanVerificationRating || 0;
        const agentRating = card.agenticUsefulness?.aiAgentRating || 0;
        const isEssential = essentials.forAgents.includes(card) || essentials.forHumans.includes(card);
        
        return {
          name: `${card.name} ${isEssential ? chalk.yellow('⭐') : ''} (Human: ${humanRating}/5, Agent: ${agentRating}/5)`,
          value: card.id,
          short: card.id
        };
      });
      
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'server',
          message: 'Select an MCP server to add:',
          choices,
          pageSize: 15
        }
      ]);
      
      selectedServer = answer.server;
    }

    // Step 2: Load server card
    const serverCard = serverCardsManager.getCard(selectedServer);
    
    if (!serverCard) {
      console.error(chalk.red(`❌ Server '${selectedServer}' not found in catalog`));
      console.log('Available servers:', serverCardsManager.getAllCards().map(c => c.id).join(', '));
      process.exit(1);
    }

    // Check if already configured
    const isConfigured = await configManager.isServerConfigured(serverCard.id);
    if (isConfigured) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Server '${serverCard.name}' is already configured. Reconfigure?`,
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.yellow('Cancelled'));
        process.exit(0);
      }
    }

    console.log();
    console.log(chalk.cyan(`📦 Adding: ${serverCard.name}`));
    console.log(chalk.gray(`   ${serverCard.useCases?.generic?.[0] || 'MCP server'}`));
    
    // Show agentic usefulness
    if (serverCard.agenticUsefulness) {
      console.log(chalk.gray(`   Human Verification: ${serverCard.agenticUsefulness.humanVerificationRating}/5`));
      console.log(chalk.gray(`   AI Agent Use: ${serverCard.agenticUsefulness.aiAgentRating}/5`));
    }
    console.log();

    // Step 3: Determine scope
    const { scope } = await inquirer.prompt([
      {
        type: 'list',
        name: 'scope',
        message: 'Configuration scope:',
        choices: [
          { name: 'Global (all projects)', value: 'global' },
          { name: 'Project-specific (this project only)', value: 'project' }
        ],
        default: 'global'
      }
    ]);

    // Step 4: Check and prompt for environment variables
    const requiredEnvVars = serverCardsManager.getRequiredEnvVars(serverCard);
    const optionalEnvVars = serverCardsManager.getOptionalEnvVars(serverCard);
    const envVars = {};
    
    if (requiredEnvVars.length > 0 || optionalEnvVars.length > 0) {
      console.log();
      console.log(chalk.yellow('📝 Environment Variables'));
      console.log();
      
      // Check existing environment
      const projectEnv = await configManager.readProjectEnv();
      const globalEnv = process.env;
      
      // Required variables
      for (const envVar of requiredEnvVars) {
        const existing = projectEnv[envVar.name] || globalEnv[envVar.name];
        
        if (existing) {
          const { useExisting } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'useExisting',
              message: `${envVar.name} is already set. Use existing value?`,
              default: true
            }
          ]);
          
          if (useExisting) {
            envVars[envVar.name] = existing;
            continue;
          }
        }
        
        const { value } = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: `${envVar.name} (required):`,
            default: envVar.example || '',
            validate: input => input.length > 0 || 'This field is required'
          }
        ]);
        
        envVars[envVar.name] = value;
      }
      
      // Optional variables
      if (optionalEnvVars.length > 0) {
        const { configureOptional } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'configureOptional',
            message: 'Configure optional environment variables?',
            default: false
          }
        ]);
        
        if (configureOptional) {
          for (const envVar of optionalEnvVars) {
            const existing = projectEnv[envVar.name] || globalEnv[envVar.name];
            
            if (existing) {
              console.log(chalk.gray(`   ${envVar.name} already set, skipping...`));
              envVars[envVar.name] = existing;
              continue;
            }
            
            const { value } = await inquirer.prompt([
              {
                type: 'input',
                name: 'value',
                message: `${envVar.name} (optional):`,
                default: envVar.example || ''
              }
            ]);
            
            if (value) {
              envVars[envVar.name] = value;
            }
          }
        }
      }
    }

    // Step 5: Generate server configuration
    const serverConfig = serverCardsManager.generateServerConfig(serverCard, envVars);
    
    // Step 6: Apply configuration
    console.log();
    console.log(chalk.yellow('💾 Applying configuration...'));
    
    if (scope === 'global') {
      // Backup and update global config
      const globalConfigPath = path.join(process.env.HOME, '.claude.json');
      await configManager.backupConfig(globalConfigPath);
      
      // Add to global config
      await configManager.addServerGlobal(serverCard.id, serverConfig);
      console.log(chalk.green('✓ Updated ~/.claude.json'));
      
      // Update project .env with placeholders if needed
      if (Object.keys(envVars).length > 0) {
        const envPath = path.join(process.cwd(), '.env');
        const envExists = await fs.pathExists(envPath);
        
        if (envExists) {
          // Add environment variables to project .env
          let envContent = await fs.readFile(envPath, 'utf-8');
          
          // Add header if not present
          if (!envContent.includes(`# ${serverCard.name}`)) {
            envContent += `\n# ${serverCard.name}\n`;
            
            for (const [key, value] of Object.entries(envVars)) {
              if (!envContent.includes(`export ${key}=`)) {
                envContent += `export ${key}="${value}"\n`;
              }
            }
            
            await fs.writeFile(envPath, envContent);
            console.log(chalk.green('✓ Updated .env with environment variables'));
          }
        }
      }
    } else {
      // Project-specific configuration
      await configManager.addServerProject(serverCard.id, envVars);
      console.log(chalk.green('✓ Updated project .env'));
      
      // Also need to ensure it's in global config with placeholders
      const globalConfig = await configManager.readGlobalConfig();
      if (!globalConfig.mcpServers[serverCard.id]) {
        const placeholderConfig = serverCardsManager.generateServerConfig(serverCard, {});
        await configManager.addServerGlobal(serverCard.id, placeholderConfig);
        console.log(chalk.green('✓ Added placeholder to ~/.claude.json'));
      }
    }

    // Step 7: Update CLAUDE.md
    console.log(chalk.yellow('📄 Updating CLAUDE.md...'));
    await claudeMdGenerator.generate();
    console.log(chalk.green('✓ Updated CLAUDE.md'));
    console.log();

    // Step 8: Show success and next steps
    console.log(chalk.green.bold('✅ Server added successfully!'));
    console.log();
    console.log(chalk.cyan(`${serverCard.name} is now configured.`));
    
    // Show best practices if available
    if (serverCard.agenticUsefulness?.bestPractices?.length > 0) {
      console.log();
      console.log('Best practices:');
      for (const practice of serverCard.agenticUsefulness.bestPractices.slice(0, 3)) {
        console.log(chalk.gray(`  • ${practice}`));
      }
    }
    
    // Show integration synergies
    if (serverCard.agenticUsefulness?.integrationSynergies?.length > 0) {
      console.log();
      console.log('Works well with:');
      for (const synergy of serverCard.agenticUsefulness.integrationSynergies.slice(0, 3)) {
        console.log(chalk.gray(`  • ${synergy}`));
      }
    }
    
    console.log();
    console.log('Next steps:');
    console.log('1. Restart Claude Code to load the new server');
    console.log('2. Verify with: ' + chalk.cyan('/mcp list'));
    console.log('3. Test the server in your Claude Code session');
    
    // Runtime-specific instructions
    if (serverCard.runtime === 'docker') {
      console.log();
      console.log(chalk.yellow('⚠️  This server requires Docker to be running'));
    } else if (serverCard.runtime === 'python') {
      console.log();
      console.log(chalk.yellow('⚠️  This server requires Python and uv'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Error adding server:'), error.message);
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const serverName = args[0];

// Run the add command
add(serverName).catch(console.error);