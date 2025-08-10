#!/usr/bin/env node
/**
 * /mcp-helper init-status - Initialize project status tracking
 * Sets up PROJECT_STATUS.json and status management infrastructure
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initStatus() {
  console.log(chalk.blue.bold('📊 MCP Helper - Initialize Status Tracking'));
  console.log();

  try {
    const projectPath = process.cwd();
    const projectName = path.basename(projectPath);
    
    // Check if status tracking already exists
    const statusFile = path.join(projectPath, 'PROJECT_STATUS.json');
    const statusManagerFile = path.join(projectPath, 'lib', 'status-manager.js');
    
    if (await fs.pathExists(statusFile)) {
      console.log(chalk.yellow('⚠️  PROJECT_STATUS.json already exists'));
      
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Status tracking is already initialized. Reinitialize?',
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.yellow('Cancelled'));
        return;
      }
      
      // Backup existing status
      const backupDir = path.join(projectPath, '.status-backups');
      await fs.ensureDir(backupDir);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `status-backup-${timestamp}.json`);
      await fs.copy(statusFile, backupFile);
      console.log(chalk.gray(`Backup created: ${backupFile}`));
    }

    // Gather project information
    console.log(chalk.cyan('📋 Project Configuration'));
    console.log();
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: projectName,
        validate: input => input.length > 0 || 'Project name is required'
      },
      {
        type: 'input',
        name: 'userName',
        message: 'Your name:',
        default: process.env.USER || 'developer'
      },
      {
        type: 'confirm',
        name: 'useWeightedCompletion',
        message: 'Use weighted completion calculation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableMemorySync',
        message: 'Enable memory synchronization (requires memory MCP server)?',
        default: true
      },
      {
        type: 'confirm',
        name: 'autoUpdateClaudeMd',
        message: 'Auto-update CLAUDE.md with status changes?',
        default: true
      }
    ]);

    // Get initial features if this is a new project
    let features = {};
    
    const { addFeatures } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addFeatures',
        message: 'Add initial project features to track?',
        default: true
      }
    ]);
    
    if (addFeatures) {
      const { featureList } = await inquirer.prompt([
        {
          type: 'input',
          name: 'featureList',
          message: 'Enter feature names (comma-separated):',
          default: 'core_functionality, documentation, testing, deployment',
          filter: input => input.split(',').map(s => s.trim()).filter(s => s.length > 0)
        }
      ]);
      
      for (const featureName of featureList) {
        const { completion } = await inquirer.prompt([
          {
            type: 'number',
            name: 'completion',
            message: `Initial completion % for "${featureName}":`,
            default: 0,
            validate: input => (input >= 0 && input <= 100) || 'Must be between 0 and 100'
          }
        ]);
        
        features[featureName.toLowerCase().replace(/\s+/g, '_')] = {
          name: featureName,
          completion: completion,
          last_updated: new Date().toISOString()
        };
      }
    }

    // Create PROJECT_STATUS.json
    console.log();
    console.log(chalk.yellow('📄 Creating PROJECT_STATUS.json...'));
    
    const statusData = {
      project: answers.projectName,
      overall_completion: calculateOverallCompletion(features, answers.useWeightedCompletion),
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString(),
      created_by: answers.userName,
      tracking_config: {
        weighted_completion: answers.useWeightedCompletion,
        memory_sync: answers.enableMemorySync,
        auto_update_claudemd: answers.autoUpdateClaudeMd
      },
      features: features,
      todos: [],
      critical_notes: [],
      metadata: {
        version: '1.0.0',
        schema: 'mcp-helper-status-v1'
      }
    };
    
    await fs.writeJson(statusFile, statusData, { spaces: 2 });
    console.log(chalk.green('✓ Created PROJECT_STATUS.json'));

    // Copy StatusManager template
    console.log(chalk.yellow('📦 Installing StatusManager...'));
    
    const templatePath = path.join(__dirname, '..', 'templates', 'status-tracking', 'status-manager.template.js');
    const targetDir = path.join(projectPath, 'lib');
    await fs.ensureDir(targetDir);
    
    // Read template and replace placeholders
    let template = await fs.readFile(templatePath, 'utf-8');
    template = template.replace(/\{\{PROJECT_NAME\}\}/g, answers.projectName);
    template = template.replace(/\{\{USER_NAME\}\}/g, answers.userName);
    
    await fs.writeFile(statusManagerFile, template);
    console.log(chalk.green('✓ Installed lib/status-manager.js'));

    // Create status tracking documentation
    console.log(chalk.yellow('📚 Creating documentation...'));
    
    const docsDir = path.join(projectPath, 'docs', 'status-tracking');
    await fs.ensureDir(docsDir);
    
    const playbook = `# Status Tracking Playbook

## Overview
This project uses MCP Helper's status tracking system to maintain a single source of truth for project progress.

## Configuration
- **Project**: ${answers.projectName}
- **Weighted Completion**: ${answers.useWeightedCompletion ? 'Enabled' : 'Disabled'}
- **Memory Sync**: ${answers.enableMemorySync ? 'Enabled' : 'Disabled'}
- **Auto-update CLAUDE.md**: ${answers.autoUpdateClaudeMd ? 'Enabled' : 'Disabled'}

## Files
- \`PROJECT_STATUS.json\` - Central status tracking file
- \`lib/status-manager.js\` - Status management class
- \`.status-backups/\` - Automatic backups directory

## Usage

### Update Feature Progress
\`\`\`javascript
import { StatusManager } from './lib/status-manager.js';
const statusManager = new StatusManager();
await statusManager.updateFeature('core_functionality', 75, 'API implementation complete');
\`\`\`

### Add Todo Items
\`\`\`javascript
await statusManager.addTodo('Implement user authentication');
await statusManager.updateTodo('todo-123456', 'in_progress');
\`\`\`

### Generate Status Report
\`\`\`javascript
const report = await statusManager.generateReport();
console.log(report);
\`\`\`

## Integration with CLAUDE.md
${answers.autoUpdateClaudeMd ? 'Status updates automatically sync to CLAUDE.md via the ClaudeMdGenerator.' : 'Manual updates required - run ClaudeMdGenerator after status changes.'}

## Best Practices
1. Update status after completing major tasks
2. Use critical notes for blockers or important decisions
3. Keep feature names consistent across the project
4. Review and update completion percentages weekly
5. Use todos for granular task tracking

## Troubleshooting
- If status file becomes corrupted, restore from \`.status-backups/\`
- Run \`/mcp-helper init-status\` to reinitialize if needed
- Check console for StatusManager error messages
`;
    
    await fs.writeFile(path.join(docsDir, 'PLAYBOOK.md'), playbook);
    console.log(chalk.green('✓ Created docs/status-tracking/PLAYBOOK.md'));

    // Update .gitignore
    const gitignorePath = path.join(projectPath, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      let gitignore = await fs.readFile(gitignorePath, 'utf-8');
      
      if (!gitignore.includes('.status-backups')) {
        gitignore += '\n# Status tracking backups\n.status-backups/\n';
        await fs.writeFile(gitignorePath, gitignore);
        console.log(chalk.green('✓ Updated .gitignore'));
      }
    }

    // Show summary
    console.log();
    console.log(chalk.green.bold('✅ Status Tracking Initialized!'));
    console.log();
    console.log('Status tracking is now active with:');
    console.log(`  • Project: ${chalk.cyan(answers.projectName)}`);
    console.log(`  • Overall completion: ${chalk.cyan(statusData.overall_completion + '%')}`);
    console.log(`  • Features tracked: ${chalk.cyan(Object.keys(features).length)}`);
    
    if (answers.autoUpdateClaudeMd) {
      console.log();
      console.log(chalk.yellow('⚠️  Note: Run /mcp-helper list to update CLAUDE.md with status'));
    }
    
    console.log();
    console.log('Next steps:');
    console.log('1. Review PROJECT_STATUS.json');
    console.log('2. Import StatusManager in your code:');
    console.log(chalk.gray('   import { StatusManager } from "./lib/status-manager.js";'));
    console.log('3. Update feature progress as you work');
    console.log('4. Check status with: ' + chalk.cyan('cat PROJECT_STATUS.json'));
    
    // Show example usage
    console.log();
    console.log('Example usage:');
    console.log(chalk.gray(`
// In your code
import { StatusManager } from './lib/status-manager.js';
const statusManager = new StatusManager();

// Update a feature
await statusManager.updateFeature('testing', 50, 'Unit tests complete');

// Add a todo
await statusManager.addTodo('Add integration tests');

// Generate report
const report = await statusManager.generateReport();
console.log(report);
`));

  } catch (error) {
    console.error(chalk.red('❌ Error initializing status tracking:'), error.message);
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

/**
 * Calculate overall completion
 */
function calculateOverallCompletion(features, useWeighted) {
  const values = Object.values(features);
  if (values.length === 0) return 0;
  
  if (useWeighted) {
    // Default weights for common features
    const weights = {
      core_functionality: 0.4,
      documentation: 0.15,
      testing: 0.2,
      deployment: 0.15,
      optimization: 0.1
    };
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const [key, feature] of Object.entries(features)) {
      const weight = weights[key] || (1 / Object.keys(features).length);
      totalWeight += weight;
      weightedSum += (feature.completion || 0) * weight;
    }
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  } else {
    const sum = values.reduce((acc, f) => acc + (f.completion || 0), 0);
    return Math.round(sum / values.length);
  }
}

// Run the command
initStatus().catch(console.error);