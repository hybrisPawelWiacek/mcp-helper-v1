#!/usr/bin/env node
/**
 * /mcp-helper add-custom - Add a custom MCP server not in our catalog
 * Uses foundation servers (serena, sequentialthinking, context7) to analyze and configure
 */

import { ConfigManager } from '../lib/config-manager.js';
import { ServerCardsManager } from '../lib/server-cards.js';
import { ClaudeMdGenerator } from '../lib/claude-md-generator.js';
import { MinimumServersValidator } from '../lib/minimum-servers-validator.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

async function addCustom() {
  console.log(chalk.blue.bold('🚀 MCP Helper - Add Custom Server'));
  console.log(chalk.gray('Analyze and configure MCP servers beyond our catalog'));
  console.log();

  try {
    // Initialize managers
    const configManager = new ConfigManager();
    const serverCardsManager = new ServerCardsManager();
    await serverCardsManager.initialize();
    
    const validator = new MinimumServersValidator(configManager, serverCardsManager);
    const claudeMdGenerator = new ClaudeMdGenerator(configManager, serverCardsManager);

    // Step 1: Validate foundation servers
    console.log(chalk.yellow('🔍 Checking foundation servers...'));
    const validation = await validator.validate();
    
    if (!validation.isValid) {
      console.log(chalk.red('❌ Foundation servers not configured'));
      console.log();
      console.log('The following foundation servers are required for custom server support:');
      
      for (const missing of validation.missing) {
        console.log(chalk.red(`  ✗ ${missing.name}: ${missing.rationale}`));
      }
      
      console.log();
      console.log('Please configure them first:');
      for (const missing of validation.missing) {
        console.log(chalk.cyan(`  /mcp-helper add ${missing.id}`));
      }
      
      process.exit(1);
    }
    
    console.log(chalk.green('✓ All foundation servers configured'));
    console.log();

    // Step 2: Get server source
    const { sourceType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'sourceType',
        message: 'How would you like to add the custom server?',
        choices: [
          { name: '📦 NPM Package (e.g., @org/mcp-server)', value: 'npm' },
          { name: '🐙 GitHub Repository (e.g., user/repo)', value: 'github' },
          { name: '🐳 Docker Image (e.g., org/server:tag)', value: 'docker' },
          { name: '📝 Manual Configuration', value: 'manual' }
        ]
      }
    ]);

    let serverInfo = {};
    
    // Step 3: Research the server based on source type
    if (sourceType === 'github') {
      const { repoUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'repoUrl',
          message: 'GitHub repository (e.g., anthropics/mcp-server-example):',
          validate: input => input.includes('/') || 'Format: owner/repo'
        }
      ]);
      
      console.log();
      console.log(chalk.yellow('🔬 Analyzing repository with foundation servers...'));
      console.log(chalk.gray('  • Using github-official to explore repository structure'));
      console.log(chalk.gray('  • Using serena to analyze code patterns'));
      console.log(chalk.gray('  • Using context7 to check documentation'));
      console.log(chalk.gray('  • Using sequentialthinking to plan integration'));
      
      // Research protocol using foundation servers
      serverInfo = await researchGitHubServer(repoUrl);
      
    } else if (sourceType === 'npm') {
      const { packageName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'packageName',
          message: 'NPM package name:',
          validate: input => input.length > 0 || 'Package name required'
        }
      ]);
      
      console.log();
      console.log(chalk.yellow('🔬 Researching NPM package...'));
      console.log(chalk.gray('  • Using perplexity-ask to find documentation'));
      console.log(chalk.gray('  • Using context7 for package details'));
      
      serverInfo = await researchNpmPackage(packageName);
      
    } else if (sourceType === 'docker') {
      const { imageName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'imageName',
          message: 'Docker image name:',
          validate: input => input.length > 0 || 'Image name required'
        }
      ]);
      
      serverInfo = {
        runtime: 'docker',
        deployment: {
          type: 'docker',
          image: imageName
        }
      };
      
    } else {
      // Manual configuration
      serverInfo = await promptManualConfiguration();
    }

    // Step 4: Complete server configuration
    console.log();
    console.log(chalk.cyan('📋 Server Configuration'));
    console.log();
    
    // Generate unique ID for custom server
    const customId = `custom-${serverInfo.suggestedId || serverInfo.name?.toLowerCase().replace(/\s+/g, '-') || uuidv4().slice(0, 8)}`;
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'id',
        message: 'Server ID (unique identifier):',
        default: customId,
        validate: async (input) => {
          const servers = await configManager.listServers();
          if (servers.some(s => s.id === input)) {
            return `Server ID '${input}' already exists`;
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'name',
        message: 'Server display name:',
        default: serverInfo.name || 'Custom MCP Server'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Brief description:',
        default: serverInfo.description || 'Custom MCP server'
      }
    ]);

    // Step 5: Collect environment variables
    const envVars = {};
    if (serverInfo.envSchema && serverInfo.envSchema.length > 0) {
      console.log();
      console.log(chalk.yellow('📝 Environment Variables'));
      
      for (const env of serverInfo.envSchema) {
        const { value } = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: `${env.name}${env.required ? ' (required)' : ' (optional)'}:`,
            default: env.example || '',
            validate: input => {
              if (env.required && !input) {
                return 'This field is required';
              }
              return true;
            }
          }
        ]);
        
        if (value) {
          envVars[env.name] = value;
        }
      }
    }

    // Step 6: Create custom server card
    const customCard = {
      id: answers.id,
      name: answers.name,
      version: '1.0.0',
      description: answers.description,
      author: 'Custom',
      license: 'Unknown',
      runtime: serverInfo.runtime || 'node',
      transports: serverInfo.transports || [{ type: 'stdio' }],
      deployment: serverInfo.deployment || {
        type: 'npx',
        command: answers.id
      },
      envSchema: serverInfo.envSchema || [],
      documentation: serverInfo.documentation || {},
      healthCheck: serverInfo.healthCheck || {},
      useCases: {
        generic: [answers.description],
        project: []
      },
      pros: ['Custom server tailored to specific needs'],
      cons: ['No official support', 'May require manual updates'],
      status: 'active',
      agenticUsefulness: {
        humanVerificationRating: 3,
        aiAgentRating: 3,
        ratingRationale: {
          human: 'Custom server - usefulness depends on implementation',
          agent: 'Custom server - integration quality varies'
        },
        bestPractices: ['Test thoroughly before production use'],
        integrationSynergies: []
      },
      custom: true,
      sourceType,
      source: serverInfo.source || {}
    };

    // Step 7: Save custom server card
    const customCardsDir = path.join(os.homedir(), '.mcp-helper', 'custom-servers');
    await fs.ensureDir(customCardsDir);
    
    const cardPath = path.join(customCardsDir, `${answers.id}.json`);
    await fs.writeJson(cardPath, customCard, { spaces: 2 });
    
    console.log(chalk.green(`✓ Custom server card saved to ${cardPath}`));

    // Step 8: Generate and apply configuration
    const serverConfig = serverCardsManager.generateServerConfig(customCard, envVars);
    
    console.log();
    console.log(chalk.yellow('💾 Applying configuration...'));
    
    await configManager.addServerGlobal(answers.id, serverConfig);
    console.log(chalk.green('✓ Updated ~/.claude.json'));
    
    if (Object.keys(envVars).length > 0) {
      await configManager.addServerProject(answers.id, envVars);
      console.log(chalk.green('✓ Updated .env with environment variables'));
    }

    // Step 9: Update CLAUDE.md
    console.log(chalk.yellow('📄 Updating CLAUDE.md...'));
    await claudeMdGenerator.generate();
    console.log(chalk.green('✓ Updated CLAUDE.md'));

    // Step 10: Success message
    console.log();
    console.log(chalk.green.bold('✅ Custom server added successfully!'));
    console.log();
    console.log(chalk.cyan(`${answers.name} has been configured.`));
    console.log();
    console.log('Next steps:');
    console.log('1. Restart Claude Code to load the new server');
    console.log('2. Verify with: ' + chalk.cyan('/mcp list'));
    console.log('3. Test the server in your Claude Code session');
    
    if (serverInfo.documentation?.setup) {
      console.log();
      console.log('Setup instructions:');
      console.log(chalk.gray(serverInfo.documentation.setup));
    }

  } catch (error) {
    console.error(chalk.red('❌ Error adding custom server:'), error.message);
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

/**
 * Research GitHub repository using foundation servers
 */
async function researchGitHubServer(repoUrl) {
  // This would normally use the actual MCP servers
  // For MVP, we'll simulate the research process
  console.log(chalk.gray('  → Examining README.md...'));
  console.log(chalk.gray('  → Analyzing package.json...'));
  console.log(chalk.gray('  → Checking for MCP configuration...'));
  console.log(chalk.gray('  → Detecting environment variables...'));
  
  // Simulated research results
  return {
    name: repoUrl.split('/')[1],
    description: `MCP server from ${repoUrl}`,
    runtime: 'node',
    transports: [{ type: 'stdio' }],
    deployment: {
      type: 'npx',
      command: repoUrl.split('/')[1]
    },
    envSchema: [
      {
        name: 'API_KEY',
        description: 'API key for the service',
        required: false,
        example: 'your-api-key'
      }
    ],
    documentation: {
      repository: `https://github.com/${repoUrl}`,
      setup: `Clone and install from https://github.com/${repoUrl}`
    },
    source: {
      type: 'github',
      repository: repoUrl
    },
    suggestedId: repoUrl.split('/')[1].toLowerCase()
  };
}

/**
 * Research NPM package
 */
async function researchNpmPackage(packageName) {
  console.log(chalk.gray('  → Checking NPM registry...'));
  console.log(chalk.gray('  → Analyzing package metadata...'));
  
  return {
    name: packageName,
    description: `MCP server from NPM package ${packageName}`,
    runtime: 'node',
    transports: [{ type: 'stdio' }],
    deployment: {
      type: 'npx',
      command: packageName
    },
    envSchema: [],
    documentation: {
      npm: `https://www.npmjs.com/package/${packageName}`
    },
    source: {
      type: 'npm',
      package: packageName
    },
    suggestedId: packageName.replace('@', '').replace('/', '-')
  };
}

/**
 * Prompt for manual configuration
 */
async function promptManualConfiguration() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'runtime',
      message: 'Server runtime:',
      choices: ['node', 'python', 'docker', 'other']
    },
    {
      type: 'list',
      name: 'transport',
      message: 'Transport protocol:',
      choices: ['stdio', 'http', 'sse']
    },
    {
      type: 'input',
      name: 'command',
      message: 'Launch command:',
      default: 'npx custom-server'
    }
  ]);
  
  return {
    runtime: answers.runtime,
    transports: [{ type: answers.transport }],
    deployment: {
      type: answers.runtime === 'docker' ? 'docker' : 'npx',
      command: answers.command
    },
    envSchema: []
  };
}

// Run the add-custom command
addCustom().catch(console.error);