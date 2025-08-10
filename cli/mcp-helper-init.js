#!/usr/bin/env node
/**
 * /mcp-helper init - Initialize MCP configuration for a project
 * This slash command is executed within Claude Code chat interface
 */

import { ConfigManager } from '../lib/config-manager.js';
import { ServerCardsManager } from '../lib/server-cards.js';
import { ClaudeMdGenerator } from '../lib/claude-md-generator.js';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

async function init() {
  console.log(chalk.blue.bold('🚀 MCP Helper - Initializing project configuration'));
  console.log();

  try {
    // Initialize managers
    const configManager = new ConfigManager();
    const serverCardsManager = new ServerCardsManager();
    await serverCardsManager.initialize();
    
    const claudeMdGenerator = new ClaudeMdGenerator(configManager, serverCardsManager);

    // Step 1: Detect environment
    console.log(chalk.yellow('📋 Detecting environment...'));
    
    const checks = {
      docker: await checkDocker(),
      node: await checkNode(),
      python: await checkPython(),
      claudeConfig: await fs.pathExists(path.join(process.env.HOME, '.claude.json')),
      projectEnv: await fs.pathExists(path.join(process.cwd(), '.env'))
    };

    console.log('Environment check:');
    console.log(`  Docker: ${checks.docker ? chalk.green('✓') : chalk.red('✗')} ${checks.docker ? 'Available' : 'Not found'}`);
    console.log(`  Node.js: ${checks.node ? chalk.green('✓') : chalk.red('✗')} ${checks.node ? 'Available' : 'Not found'}`);
    console.log(`  Python/uv: ${checks.python ? chalk.green('✓') : chalk.red('✗')} ${checks.python ? 'Available' : 'Not found'}`);
    console.log(`  Global config: ${checks.claudeConfig ? chalk.green('✓') : chalk.red('✗')} ${checks.claudeConfig ? 'Found' : 'Not found'}`);
    console.log(`  Project .env: ${checks.projectEnv ? chalk.green('✓') : chalk.red('✗')} ${checks.projectEnv ? 'Found' : 'Will create'}`);
    console.log();

    // Step 2: Create/update .env if needed
    if (!checks.projectEnv) {
      console.log(chalk.yellow('📝 Creating .env file...'));
      
      const envTemplate = `# MCP Helper - Project Environment Variables
# Generated on ${new Date().toISOString()}

# Add your API keys and configuration here
# Example:
# export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_..."
# export BRAVE_API_KEY="BSA..."
# export FIRECRAWL_API_KEY="fc-..."
# export PERPLEXITY_API_KEY="pplx-..."
`;
      
      await fs.writeFile(path.join(process.cwd(), '.env'), envTemplate);
      console.log(chalk.green('✓ Created .env file'));
      
      // Add to .gitignore if needed
      await ensureGitignore();
    }

    // Step 3: Check configured servers
    console.log(chalk.yellow('🔍 Checking configured servers...'));
    const servers = await configManager.listServers();
    
    if (servers.length === 0) {
      console.log(chalk.yellow('No MCP servers configured yet.'));
      console.log();
      console.log('To add your first server, use:');
      console.log(chalk.cyan('  /mcp-helper add <server-name>'));
      console.log();
      console.log('Recommended servers based on agentic usefulness:');
      console.log();
      
      // Get essential servers
      const essentials = serverCardsManager.getEssentialServers();
      
      // Show top servers for AI agents
      console.log(chalk.cyan('  Essential for AI Agents (Rating 5/5):'));
      for (const card of essentials.forAgents.slice(0, 3)) {
        const bestPractice = card.agenticUsefulness?.bestPractices?.[0] || '';
        console.log(`    - ${chalk.bold(card.id)}: ${card.name}`);
        if (bestPractice) {
          console.log(`      ${chalk.gray(bestPractice)}`);
        }
      }
      console.log();
      
      // Show top servers for human verification
      console.log(chalk.cyan('  Essential for Human Verification (Rating 4+/5):'));
      for (const card of essentials.forHumans.slice(0, 3)) {
        const humanRole = card.agenticUsefulness?.humanRole || '';
        console.log(`    - ${chalk.bold(card.id)}: ${card.name}`);
        if (humanRole) {
          console.log(`      ${chalk.gray(humanRole)}`);
        }
      }
      console.log();
      
      const activeCards = serverCardsManager.getActiveCards();
      if (activeCards.length > 6) {
        console.log(`  ... and ${activeCards.length - 6} more available servers`);
      }
    } else {
      console.log(`Found ${servers.length} configured server(s):`);
      for (const server of servers) {
        const card = serverCardsManager.getCard(server.id);
        const status = server.hasProjectOverrides ? 'project override' : server.scope;
        console.log(`  - ${chalk.bold(server.id)} (${status}): ${card?.name || 'Unknown'}`);
      }
    }
    console.log();

    // Step 4: Generate/update CLAUDE.md
    console.log(chalk.yellow('📄 Generating CLAUDE.md...'));
    
    const claudeMdExists = await claudeMdGenerator.exists();
    await claudeMdGenerator.generate();
    
    if (claudeMdExists) {
      console.log(chalk.green('✓ Updated CLAUDE.md'));
    } else {
      console.log(chalk.green('✓ Created CLAUDE.md'));
    }
    console.log();

    // Step 5: Provide next steps
    console.log(chalk.green.bold('✅ Initialization complete!'));
    console.log();
    console.log('Next steps:');
    console.log('1. Add MCP servers with: ' + chalk.cyan('/mcp-helper add <server-name>'));
    console.log('2. Configure environment variables in ' + chalk.cyan('.env'));
    console.log('3. List configured servers with: ' + chalk.cyan('/mcp-helper list'));
    console.log('4. View server documentation in ' + chalk.cyan('CLAUDE.md'));
    console.log();
    
    // Provide recommendations based on environment
    if (!checks.docker) {
      console.log(chalk.yellow('⚠️  Docker is not installed. Some servers require Docker.'));
      console.log('   Install Docker from: https://docs.docker.com/get-docker/');
    }
    
    if (!checks.node) {
      console.log(chalk.yellow('⚠️  Node.js is not installed. NPX-based servers require Node.js.'));
      console.log('   Install Node.js from: https://nodejs.org/');
    }

  } catch (error) {
    console.error(chalk.red('❌ Error during initialization:'), error.message);
    process.exit(1);
  }
}

/**
 * Check if Docker is available
 */
async function checkDocker() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('docker --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Node.js is available
 */
async function checkNode() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('node --version');
    await execAsync('npm --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Python and uv are available
 */
async function checkPython() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('python3 --version');
    await execAsync('uvx --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure .env is in .gitignore
 */
async function ensureGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  
  try {
    let gitignore = '';
    
    if (await fs.pathExists(gitignorePath)) {
      gitignore = await fs.readFile(gitignorePath, 'utf-8');
    }
    
    if (!gitignore.includes('.env')) {
      gitignore += '\n# MCP Helper\n.env\n.env.local\n';
      await fs.writeFile(gitignorePath, gitignore);
      console.log(chalk.green('✓ Added .env to .gitignore'));
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Could not update .gitignore:'), error.message);
  }
}

// Run the init command
init().catch(console.error);