#!/usr/bin/env node

import { BaseCommand } from '../base-command.js';
import { ConfigManager } from '../../lib/config-manager.js';
import { StatusManager } from '../../lib/status-manager.js';
import fs from 'fs/promises';
import path from 'path';

export class InitCommand extends BaseCommand {
  constructor() {
    super('init', 'Initialize MCP configuration for your project');
  }

  getUsage() {
    return 'Usage: /mcp-helper init [--force]';
  }

  getExamples() {
    return `${this.colors.yellow}Examples:${this.colors.reset}
  /mcp-helper init          Initialize MCP configuration
  /mcp-helper init --force  Overwrite existing configuration`;
  }

  async execute(args) {
    const force = args.flags.force || false;
    
    this.info('Initializing MCP-Helper configuration...');
    
    // Check for existing config
    const configPath = '.env';
    try {
      await fs.access(configPath);
      if (!force) {
        this.warning('.env file already exists. Use --force to overwrite.');
        return;
      }
    } catch {}

    this.startProgress('Detecting project type');
    
    // Detect project type
    const projectInfo = await this.detectProjectType();
    
    this.endProgress();
    this.success(`Detected: ${projectInfo.type} project`);

    // Create .env file
    this.startProgress('Creating .env file');
    await this.createEnvFile(projectInfo);
    this.endProgress();

    // Initialize status tracking
    this.startProgress('Setting up status tracking');
    const statusManager = new StatusManager();
    await statusManager.initialize();
    this.endProgress();

    // Show summary
    console.log('\n' + this.colors.green + '✨ MCP-Helper initialized successfully!' + this.colors.reset);
    console.log('\nNext steps:');
    console.log('  1. Edit .env to add your API keys');
    console.log('  2. Run: /mcp-helper add <server> to add MCP servers');
    console.log('  3. Run: /mcp-helper list to see available servers');
  }

  async detectProjectType() {
    const checks = [
      { file: 'package.json', type: 'Node.js' },
      { file: 'requirements.txt', type: 'Python' },
      { file: 'Cargo.toml', type: 'Rust' },
      { file: 'go.mod', type: 'Go' },
      { file: 'pom.xml', type: 'Java' },
      { file: '.git', type: 'Git repository' }
    ];

    for (const check of checks) {
      try {
        await fs.access(check.file);
        return { type: check.type, file: check.file };
      } catch {}
    }

    return { type: 'Generic', file: null };
  }

  async createEnvFile(projectInfo) {
    const envContent = `# MCP-Helper Configuration
# Generated for ${projectInfo.type} project
# ${new Date().toISOString()}

# === Foundation Servers (Recommended) ===
# These servers provide core functionality for AI-assisted development

# Serena - Semantic code understanding (Required for code navigation)
SERENA_PROJECT_PATH="${process.cwd()}"

# Sequential Thinking - Complex reasoning (Required for planning)
# No configuration needed

# Context7 - Documentation fetching (Prevents hallucination)
# No configuration needed

# === Essential Services ===
# GitHub - Version control and collaboration
GITHUB_PERSONAL_ACCESS_TOKEN="your-github-pat-here"

# === Optional Services ===
# Uncomment and configure as needed

# Perplexity - Advanced research
# PERPLEXITY_API_KEY="your-key-here"

# Brave Search - Web search
# BRAVE_API_KEY="your-key-here"

# Firecrawl - Web scraping
# FIRECRAWL_API_KEY="your-key-here"

# Slack - Team communication
# SLACK_BOT_TOKEN="xoxb-your-token"
# SLACK_TEAM_ID="T12345678"

# PostgreSQL - Database
# POSTGRES_CONNECTION_STRING="postgresql://user:pass@localhost:5432/db"

# Memory - Persistent context
# Uses Docker, no additional config needed
`;

    await fs.writeFile('.env', envContent, 'utf8');
  }
}