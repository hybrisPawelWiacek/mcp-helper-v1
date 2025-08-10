/**
 * /mcp-helper init - Initialize MCP configuration
 * 
 * This slash command handler initializes MCP configuration for a project
 * within the Claude Code chat interface.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export default {
  name: 'init',
  description: 'Initialize MCP configuration for your project',
  usage: '/mcp-helper init',
  
  /**
   * Execute the init command
   * @param {Object} context - Command context with utilities
   * @returns {Promise<Object>} - Execution result
   */
  async execute(context) {
    const { configManager, serverCards, claudeMdGenerator, args = [] } = context;
    
    // Check for onboarding flag
    const useOnboarding = args.includes('--onboarding') || args.includes('-o');
    const quickSetup = args.includes('--quick') || args.includes('-q');
    
    if (useOnboarding) {
      // Run the onboarding wizard
      const { OnboardingWizard } = await import('../../lib/onboarding-wizard.js');
      const wizard = new OnboardingWizard();
      
      const result = await wizard.run({
        reconfigure: args.includes('--reconfigure')
      });
      
      return {
        message: result.success ? '✅ Onboarding complete!' : `❌ Onboarding failed: ${result.error}`,
        data: result.state
      };
    }
    
    if (quickSetup) {
      // Run quick setup
      const { OnboardingWizard } = await import('../../lib/onboarding-wizard.js');
      const wizard = new OnboardingWizard();
      await wizard.quickSetup();
      
      return {
        message: '⚡ Quick setup complete!',
        action: 'Run "source .env.mcp && claude" to start using MCP servers'
      };
    }
    
    try {
      // Detect environment
      const environment = await this.detectEnvironment();
      
      // Initialize configuration
      const config = await configManager.loadConfig();
      
      // Check if already initialized
      if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
        return {
          message: '✅ MCP configuration already initialized',
          data: {
            serverCount: Object.keys(config.mcpServers).length,
            servers: Object.keys(config.mcpServers)
          },
          action: 'Use `/mcp-helper list` to see configured servers or `/mcp-helper add <server>` to add more.'
        };
      }
      
      // Create .env file if it doesn't exist
      const envPath = path.join(process.cwd(), '.env');
      const envExists = await this.fileExists(envPath);
      
      if (!envExists) {
        await fs.writeFile(envPath, '# MCP Server Environment Variables\n\n', 'utf-8');
      }
      
      // Generate initial CLAUDE.md
      await claudeMdGenerator.generate(config);
      
      return {
        message: '🎉 MCP configuration initialized successfully!',
        data: {
          environment,
          configPath: configManager.configPath,
          envPath
        },
        nextSteps: [
          'Use `/mcp-helper add <server>` to add your first MCP server',
          'Use `/mcp-helper list` to see available servers',
          'Use `/mcp-helper add-custom` to add a custom server'
        ]
      };
    } catch (error) {
      return {
        message: `❌ Failed to initialize: ${error.message}`,
        error: error.stack
      };
    }
  },
  
  /**
   * Detect the current environment
   */
  async detectEnvironment() {
    const env = {
      os: os.platform(),
      nodeVersion: process.version,
      cwd: process.cwd(),
      home: os.homedir(),
      claudeConfigExists: false,
      projectType: 'unknown'
    };
    
    // Check for Claude config
    const claudeConfigPath = path.join(os.homedir(), '.claude.json');
    try {
      await fs.access(claudeConfigPath);
      env.claudeConfigExists = true;
    } catch {}
    
    // Detect project type
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      if (packageJson.dependencies?.react || packageJson.dependencies?.['react-dom']) {
        env.projectType = 'react';
      } else if (packageJson.dependencies?.vue) {
        env.projectType = 'vue';
      } else if (packageJson.dependencies?.express || packageJson.dependencies?.fastify) {
        env.projectType = 'node-backend';
      } else {
        env.projectType = 'node';
      }
    } catch {
      // Check for other project types
      const files = await fs.readdir(process.cwd());
      if (files.includes('requirements.txt') || files.includes('setup.py')) {
        env.projectType = 'python';
      } else if (files.includes('Cargo.toml')) {
        env.projectType = 'rust';
      } else if (files.includes('go.mod')) {
        env.projectType = 'go';
      }
    }
    
    return env;
  },
  
  /**
   * Check if a file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
};