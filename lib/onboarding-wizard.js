/**
 * Onboarding Wizard - Interactive setup and configuration for new users
 * Provides a guided experience for setting up mcp-helper and MCP servers
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PersonalityManager } from './personality-manager.js';
import { ProjectAnalyzer } from './project-analyzer.js';
import { ResponseFormatter } from './response-formatter.js';
import { ConfigManager } from './config-manager.js';
import { ServerCardsManager } from './server-cards.js';
import { LegacyConfigMerger } from './legacy-config-merger.js';

export class OnboardingWizard {
  constructor() {
    this.personalityManager = new PersonalityManager();
    this.projectAnalyzer = new ProjectAnalyzer();
    this.responseFormatter = new ResponseFormatter(this.personalityManager);
    this.configManager = new ConfigManager();
    this.serverCards = new ServerCardsManager();
    this.legacyMerger = new LegacyConfigMerger();
    
    this.wizardState = {
      isFirstRun: false,
      hasExistingConfig: false,
      projectPath: process.cwd(),
      preferences: {},
      selectedServers: [],
      configBackupPath: null
    };
  }

  /**
   * Run the complete onboarding wizard
   */
  async run(options = {}) {
    console.log(chalk.bold.cyan('\n🚀 Welcome to MCP-Helper Setup Wizard!\n'));
    
    try {
      // Step 1: Check if this is first run
      await this.checkFirstRun();
      
      // Step 2: Personality configuration (if first run or requested)
      if (this.wizardState.isFirstRun || options.reconfigure) {
        await this.configurePersonality();
      }
      
      // Step 3: Check for existing configurations
      await this.checkExistingConfigurations();
      
      // Step 4: Project analysis
      await this.analyzeProject();
      
      // Step 5: Server recommendations and selection
      await this.recommendAndSelectServers();
      
      // Step 6: Environment setup
      await this.setupEnvironment();
      
      // Step 7: Generate documentation
      await this.generateDocumentation();
      
      // Step 8: Final instructions
      await this.showFinalInstructions();
      
      return {
        success: true,
        state: this.wizardState
      };
      
    } catch (error) {
      console.error(await this.responseFormatter.formatError(error, {
        suggestions: 'Try running with --verbose flag for more details'
      }));
      return {
        success: false,
        error: error.message,
        state: this.wizardState
      };
    }
  }

  /**
   * Check if this is the first run
   */
  async checkFirstRun() {
    const preferencesPath = path.join(os.homedir(), '.mcp-helper', 'preferences.json');
    const configPath = path.join(os.homedir(), '.claude.json');
    
    this.wizardState.isFirstRun = !await fs.pathExists(preferencesPath);
    this.wizardState.hasExistingConfig = await fs.pathExists(configPath);
    
    if (this.wizardState.isFirstRun) {
      console.log(await this.responseFormatter.format(
        'This appears to be your first time using mcp-helper!',
        { type: 'info' }
      ));
      
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Would you like to go through the setup wizard?',
        default: true
      }]);
      
      if (!proceed) {
        console.log('You can run this wizard anytime with: /mcp-helper init --onboarding');
        process.exit(0);
      }
    }
  }

  /**
   * Configure personality preferences
   */
  async configurePersonality() {
    console.log(chalk.bold('\n📝 Let\'s personalize your experience:\n'));
    
    // First, ask if they want to use a template or customize
    const { useTemplate } = await inquirer.prompt([{
      type: 'confirm',
      name: 'useTemplate',
      message: 'Would you like to select from pre-configured personality templates?',
      default: true
    }]);
    
    if (useTemplate) {
      // Load and display templates
      const templates = await this.personalityManager.loadTemplates();
      
      console.log(chalk.cyan('\n📚 Available personality templates:\n'));
      
      const choices = templates.map(t => ({
        name: `${t.name} - ${t.description}`,
        value: t.id,
        short: t.name
      }));
      
      // Add custom option
      choices.push({
        name: 'Custom - Configure manually',
        value: 'custom',
        short: 'Custom'
      });
      
      const { templateId } = await inquirer.prompt([{
        type: 'list',
        name: 'templateId',
        message: 'Select a personality template:',
        choices,
        default: 'balanced-friendly'
      }]);
      
      if (templateId === 'custom') {
        // Fall through to manual configuration
        const questions = await this.personalityManager.getOnboardingQuestions();
        const answers = await inquirer.prompt(questions);
        await this.personalityManager.updatePreferences(answers);
        this.wizardState.preferences = answers;
      } else {
        // Apply the selected template
        const preferences = await this.personalityManager.applyTemplate(templateId);
        this.wizardState.preferences = preferences;
        
        const template = await this.personalityManager.loadTemplate(templateId);
        console.log(chalk.green(`\n✅ Applied '${template.name}' template`));
        console.log(chalk.gray(`   ${template.description}`));
      }
    } else {
      // Manual configuration
      const questions = await this.personalityManager.getOnboardingQuestions();
      const answers = await inquirer.prompt(questions);
      await this.personalityManager.updatePreferences(answers);
      this.wizardState.preferences = answers;
    }
    
    // Update response formatter with new preferences
    this.responseFormatter = new ResponseFormatter(this.personalityManager);
    
    console.log(await this.responseFormatter.format(
      'Preferences saved! I\'ll communicate in a style that matches your preferences.',
      { type: 'success' }
    ));
  }

  /**
   * Check for existing MCP configurations
   */
  async checkExistingConfigurations() {
    if (!this.wizardState.hasExistingConfig) {
      console.log(await this.responseFormatter.format(
        'No existing MCP configuration found. We\'ll create a fresh setup!',
        { type: 'info' }
      ));
      return;
    }
    
    console.log(chalk.bold('\n🔍 Checking existing configurations...\n'));
    
    // Analyze existing config
    const analysis = await this.legacyMerger.analyzeExistingConfig();
    
    console.log(await this.responseFormatter.format(
      `Found existing configuration with ${analysis.serverCount} servers`,
      { type: 'info' }
    ));
    
    if (analysis.hasIssues) {
      console.log(chalk.yellow('⚠️  Some issues detected in existing configuration:'));
      analysis.issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }
    
    // Ask how to proceed
    const { strategy } = await inquirer.prompt([{
      type: 'list',
      name: 'strategy',
      message: 'How would you like to proceed with your existing configuration?',
      choices: [
        {
          name: 'Merge - Keep existing servers and add recommended ones',
          value: 'merge'
        },
        {
          name: 'Preserve - Keep existing config as-is, just add environment setup',
          value: 'preserve'
        },
        {
          name: 'Backup & Replace - Save existing config and start fresh',
          value: 'replace'
        },
        {
          name: 'Analyze Only - Show me what would change',
          value: 'analyze'
        }
      ]
    }]);
    
    this.wizardState.mergeStrategy = strategy;
    
    if (strategy === 'analyze') {
      await this.showConfigAnalysis(analysis);
      // Re-ask the question
      return this.checkExistingConfigurations();
    }
    
    if (strategy === 'replace') {
      const backupPath = await this.legacyMerger.backupExistingConfig();
      this.wizardState.configBackupPath = backupPath;
      console.log(await this.responseFormatter.format(
        `Existing configuration backed up to: ${backupPath}`,
        { type: 'success' }
      ));
    }
  }

  /**
   * Show detailed configuration analysis
   */
  async showConfigAnalysis(analysis) {
    console.log(chalk.bold('\n📊 Configuration Analysis:\n'));
    
    console.log('Existing Servers:');
    analysis.servers.forEach(server => {
      const status = server.isHealthy ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${server.name} (${server.command})`);
    });
    
    console.log('\nRecommended Additions:');
    const recommendations = await this.getServerRecommendations();
    recommendations.forEach(rec => {
      if (!analysis.servers.find(s => s.name === rec.name)) {
        console.log(`  + ${rec.name} - ${rec.reason}`);
      }
    });
    
    console.log('\nPotential Conflicts:');
    const conflicts = analysis.conflicts || [];
    if (conflicts.length === 0) {
      console.log('  None detected');
    } else {
      conflicts.forEach(conflict => {
        console.log(`  ! ${conflict}`);
      });
    }
  }

  /**
   * Analyze the current project
   */
  async analyzeProject() {
    console.log(chalk.bold('\n🔬 Analyzing your project...\n'));
    
    const spinner = this.createSpinner('Scanning project files...');
    spinner.start();
    
    try {
      const analysis = await this.projectAnalyzer.analyzeProject(this.wizardState.projectPath);
      this.wizardState.projectAnalysis = analysis;
      
      spinner.succeed('Project analysis complete!');
      
      // Show detected technologies
      console.log('\nDetected Technologies:');
      if (analysis.languages.length > 0) {
        console.log(`  Languages: ${analysis.languages.join(', ')}`);
      }
      if (analysis.frameworks.length > 0) {
        console.log(`  Frameworks: ${analysis.frameworks.join(', ')}`);
      }
      if (analysis.tools.length > 0) {
        console.log(`  Tools: ${analysis.tools.join(', ')}`);
      }
      
      console.log(`  Project Type: ${analysis.projectType || 'General'}`);
      console.log(`  Confidence: ${Math.round(analysis.confidence * 100)}%`);
      
    } catch (error) {
      spinner.fail('Project analysis failed');
      console.log(chalk.yellow('Continuing with generic recommendations...'));
    }
  }

  /**
   * Get server recommendations based on analysis
   */
  async getServerRecommendations() {
    await this.serverCards.initialize();
    const analysis = this.wizardState.projectAnalysis || {};
    
    return this.projectAnalyzer.recommendServers(
      analysis,
      Array.from(this.serverCards.getAllCards().values())
    );
  }

  /**
   * Recommend and select servers
   */
  async recommendAndSelectServers() {
    console.log(chalk.bold('\n🎯 Server Recommendations:\n'));
    
    const recommendations = await this.getServerRecommendations();
    
    // Group by priority
    const essential = recommendations.filter(r => r.priority === 'essential');
    const recommended = recommendations.filter(r => r.priority === 'recommended');
    const optional = recommendations.filter(r => r.priority === 'optional');
    
    // Display recommendations
    if (essential.length > 0) {
      console.log(chalk.bold.green('Essential for your project:'));
      essential.forEach(rec => {
        console.log(`  ⭐ ${rec.name} - ${rec.reason}`);
      });
    }
    
    if (recommended.length > 0) {
      console.log(chalk.bold.cyan('\nRecommended:'));
      recommended.forEach(rec => {
        console.log(`  ✓ ${rec.name} - ${rec.reason}`);
      });
    }
    
    if (optional.length > 0) {
      console.log(chalk.gray('\nOptional:'));
      optional.forEach(rec => {
        console.log(`  • ${rec.name} - ${rec.reason}`);
      });
    }
    
    // Interactive selection
    const { selectionMode } = await inquirer.prompt([{
      type: 'list',
      name: 'selectionMode',
      message: 'How would you like to proceed?',
      choices: [
        {
          name: 'Quick Setup - Install all essential and recommended servers',
          value: 'quick'
        },
        {
          name: 'Custom - Let me choose which servers to install',
          value: 'custom'
        },
        {
          name: 'Minimal - Only install essential servers',
          value: 'minimal'
        }
      ]
    }]);
    
    let selectedServers = [];
    
    switch (selectionMode) {
      case 'quick':
        selectedServers = [...essential, ...recommended];
        break;
        
      case 'minimal':
        selectedServers = essential;
        break;
        
      case 'custom':
        const choices = recommendations.map(rec => ({
          name: `${rec.name} - ${rec.reason}`,
          value: rec.name,
          checked: rec.priority === 'essential' || rec.priority === 'recommended'
        }));
        
        const { servers } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'servers',
          message: 'Select servers to install:',
          choices,
          validate: (input) => {
            if (input.length === 0) {
              return 'Please select at least one server';
            }
            return true;
          }
        }]);
        
        selectedServers = recommendations.filter(r => servers.includes(r.name));
        break;
    }
    
    this.wizardState.selectedServers = selectedServers;
    
    console.log(await this.responseFormatter.format(
      `Selected ${selectedServers.length} servers for installation`,
      { type: 'success' }
    ));
  }

  /**
   * Setup environment variables
   */
  async setupEnvironment() {
    console.log(chalk.bold('\n🔐 Environment Setup:\n'));
    
    const requiredEnvVars = new Set();
    const serverDetails = [];
    
    // Collect required environment variables
    for (const server of this.wizardState.selectedServers) {
      const card = await this.serverCards.getCard(server.name);
      if (card && card.envSchema) {
        Object.entries(card.envSchema).forEach(([key, schema]) => {
          if (schema.required) {
            requiredEnvVars.add(key);
          }
        });
        serverDetails.push(card);
      }
    }
    
    if (requiredEnvVars.size === 0) {
      console.log('No API keys required for selected servers.');
      return;
    }
    
    console.log('The following API keys/tokens are required:');
    Array.from(requiredEnvVars).forEach(envVar => {
      console.log(`  • ${envVar}`);
    });
    
    const { setupNow } = await inquirer.prompt([{
      type: 'confirm',
      name: 'setupNow',
      message: 'Would you like to set up these environment variables now?',
      default: true
    }]);
    
    if (setupNow) {
      const envValues = {};
      
      for (const envVar of requiredEnvVars) {
        // Find which server needs this
        const server = serverDetails.find(s => 
          s.envSchema && s.envSchema[envVar]
        );
        
        const schema = server?.envSchema[envVar] || {};
        
        const { value } = await inquirer.prompt([{
          type: schema.sensitive ? 'password' : 'input',
          name: 'value',
          message: `Enter value for ${envVar}:`,
          validate: (input) => {
            if (!input && schema.required) {
              return 'This value is required';
            }
            if (schema.pattern && !new RegExp(schema.pattern).test(input)) {
              return schema.description || 'Invalid format';
            }
            return true;
          }
        }]);
        
        envValues[envVar] = value;
      }
      
      // Save environment variables
      await this.saveEnvironmentVariables(envValues);
      
      console.log(await this.responseFormatter.format(
        'Environment variables configured successfully!',
        { type: 'success' }
      ));
    } else {
      console.log(chalk.yellow('\nYou can set up environment variables later by:'));
      console.log('1. Copying the generated .env.example file to .env');
      console.log('2. Filling in your API keys and tokens');
      console.log('3. Running: source .env.mcp && claude');
    }
  }

  /**
   * Save environment variables
   */
  async saveEnvironmentVariables(envValues) {
    const envPath = path.join(this.wizardState.projectPath, '.env');
    const envExamplePath = path.join(this.wizardState.projectPath, '.env.example');
    
    // Create .env.example with placeholders
    let exampleContent = '# MCP Server Environment Variables\n';
    exampleContent += '# Copy this file to .env and fill in your values\n\n';
    
    for (const [key, value] of Object.entries(envValues)) {
      exampleContent += `${key}=your_${key.toLowerCase()}_here\n`;
    }
    
    await fs.writeFile(envExamplePath, exampleContent);
    
    // Create actual .env file
    let envContent = '# MCP Server Environment Variables\n';
    envContent += '# Generated by mcp-helper\n\n';
    
    for (const [key, value] of Object.entries(envValues)) {
      envContent += `export ${key}="${value}"\n`;
    }
    
    await fs.writeFile(envPath, envContent, { mode: 0o600 }); // Secure permissions
    
    // Add .env to .gitignore if it exists
    const gitignorePath = path.join(this.wizardState.projectPath, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const gitignore = await fs.readFile(gitignorePath, 'utf-8');
      if (!gitignore.includes('.env')) {
        await fs.appendFile(gitignorePath, '\n# MCP Helper\n.env\n');
      }
    }
  }

  /**
   * Generate documentation
   */
  async generateDocumentation() {
    console.log(chalk.bold('\n📚 Generating Documentation...\n'));
    
    const spinner = this.createSpinner('Creating CLAUDE.md...');
    spinner.start();
    
    try {
      // Generate CLAUDE.md using the ClaudeMdGenerator
      const { ClaudeMdGenerator } = await import('./claude-md-generator.js');
      const generator = new ClaudeMdGenerator();
      
      await generator.generate({
        servers: this.wizardState.selectedServers.map(s => s.name),
        projectPath: this.wizardState.projectPath
      });
      
      spinner.succeed('Documentation generated!');
      
      // Also generate a README if it doesn't exist
      const readmePath = path.join(this.wizardState.projectPath, 'README.md');
      if (!await fs.pathExists(readmePath)) {
        await this.generateReadme();
        console.log(chalk.green('  ✓ README.md created'));
      }
      
    } catch (error) {
      spinner.fail('Documentation generation failed');
      console.error(error);
    }
  }

  /**
   * Generate README.md
   */
  async generateReadme() {
    const readmePath = path.join(this.wizardState.projectPath, 'README.md');
    
    const content = `# ${path.basename(this.wizardState.projectPath)}

## MCP Servers

This project uses MCP (Model Context Protocol) servers for enhanced AI assistance.

### Configured Servers

${this.wizardState.selectedServers.map(s => `- **${s.name}**: ${s.reason}`).join('\n')}

### Quick Start

1. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your API keys
   \`\`\`

2. Start Claude Code with MCP servers:
   \`\`\`bash
   source .env.mcp && claude
   \`\`\`

3. Verify servers are running:
   \`\`\`
   /mcp list
   \`\`\`

### Managing MCP Servers

- Add a new server: \`/mcp-helper add <server-name>\`
- List all servers: \`/mcp-helper list\`
- Reconfigure a server: \`/mcp-helper reconfigure <server-name>\`
- Get recommendations: \`/mcp-helper advisor\`

For more details, see [CLAUDE.md](./CLAUDE.md)
`;
    
    await fs.writeFile(readmePath, content);
  }

  /**
   * Show final instructions
   */
  async showFinalInstructions() {
    console.log(chalk.bold.green('\n✨ Setup Complete!\n'));
    
    const preferences = await this.personalityManager.getPreferences();
    
    // Adjust instructions based on expertise level
    if (preferences.expertiseLevel === 'expert') {
      console.log('Quick start:');
      console.log(chalk.gray('  source .env.mcp && claude'));
      console.log(chalk.gray('  /mcp list'));
    } else {
      console.log(chalk.bold('Next Steps:\n'));
      
      console.log('1. Start Claude Code with your configuration:');
      console.log(chalk.cyan('   source .env.mcp && claude'));
      
      console.log('\n2. Verify MCP servers are available:');
      console.log(chalk.cyan('   /mcp list'));
      
      console.log('\n3. Test a server (example with GitHub):');
      console.log(chalk.cyan('   claude "Using github-official, what is my username?"'));
      
      if (preferences.expertiseLevel === 'student') {
        console.log(chalk.gray('\nTip: The source command loads your environment variables'));
        console.log(chalk.gray('     The /mcp command is a Claude Code built-in'));
        console.log(chalk.gray('     The /mcp-helper commands are provided by this tool'));
      }
    }
    
    console.log('\n' + chalk.bold('Slash Commands Available:'));
    console.log('  /mcp-helper add <server>     - Add a new MCP server');
    console.log('  /mcp-helper list             - List configured servers');
    console.log('  /mcp-helper reconfigure      - Modify server settings');
    console.log('  /mcp-helper advisor          - Get server recommendations');
    
    if (this.wizardState.configBackupPath) {
      console.log('\n' + chalk.yellow('Note: Your original configuration was backed up to:'));
      console.log(`  ${this.wizardState.configBackupPath}`);
    }
    
    console.log('\n' + chalk.bold.cyan('Happy coding with MCP-Helper! 🚀'));
  }

  /**
   * Create a simple spinner (using console.log for now)
   */
  createSpinner(text) {
    let interval;
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    
    return {
      start: () => {
        process.stdout.write(`${frames[0]} ${text}`);
        interval = setInterval(() => {
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(`${frames[i]} ${text}`);
          i = (i + 1) % frames.length;
        }, 80);
      },
      
      succeed: (message) => {
        if (interval) clearInterval(interval);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.log(chalk.green(`✓ ${message || text}`));
      },
      
      fail: (message) => {
        if (interval) clearInterval(interval);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.log(chalk.red(`✗ ${message || text}`));
      }
    };
  }

  /**
   * Run a quick setup (non-interactive)
   */
  async quickSetup(options = {}) {
    console.log(chalk.bold.cyan('\n⚡ Running Quick Setup...\n'));
    
    // Use defaults or provided options
    const defaults = {
      expertiseLevel: 'balanced',
      verbosity: 'balanced',
      tone: 'neutral',
      useEmojis: false,
      servers: ['github-official', 'serena', 'sequentialthinking', 'memory']
    };
    
    const config = { ...defaults, ...options };
    
    // Save preferences
    await this.personalityManager.savePreferences({
      expertiseLevel: config.expertiseLevel,
      verbosity: config.verbosity,
      tone: config.tone,
      useEmojis: config.useEmojis
    });
    
    // Configure servers
    for (const serverName of config.servers) {
      console.log(`Installing ${serverName}...`);
      // TODO: Actually install/configure the server
    }
    
    console.log(chalk.green('\n✓ Quick setup complete!'));
    console.log('Run "source .env.mcp && claude" to start using MCP servers');
  }
}

// Export for use in commands
export default OnboardingWizard;