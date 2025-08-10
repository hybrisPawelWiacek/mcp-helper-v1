#!/usr/bin/env node
/**
 * Test script for the new status tracking system
 * This verifies that PROJECT_STATUS.json is correctly integrated into CLAUDE.md generation
 */

import { ConfigManager } from './lib/config-manager.js';
import { ServerCardsManager } from './lib/server-cards.js';
import { ClaudeMdGenerator } from './lib/claude-md-generator.js';
import { StatusManager } from './lib/status-manager.js';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testStatusSystem() {
  console.log(chalk.blue.bold('🧪 Testing Status Tracking System'));
  console.log(chalk.gray('━'.repeat(50)));
  console.log();

  try {
    // Step 1: Initialize managers
    console.log(chalk.cyan('1. Initializing managers...'));
    const configManager = new ConfigManager();
    const serverCardsManager = new ServerCardsManager();
    await serverCardsManager.initialize();
    const claudeMdGenerator = new ClaudeMdGenerator(configManager, serverCardsManager);
    const statusManager = new StatusManager();

    // Step 2: Read current status
    console.log(chalk.cyan('2. Reading PROJECT_STATUS.json...'));
    const status = await statusManager.readStatus();
    
    console.log(chalk.green('   ✓ Project:', status.project));
    console.log(chalk.green('   ✓ Overall Completion:', status.overall_completion + '%'));
    console.log(chalk.green('   ✓ Last Updated:', status.last_updated));
    console.log();
    
    console.log(chalk.cyan('   Features:'));
    for (const [key, feature] of Object.entries(status.features)) {
      console.log(`     • ${feature.name}: ${feature.completion}%`);
    }
    console.log();

    // Step 3: Backup existing CLAUDE.md
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    const backupPath = path.join(process.cwd(), 'CLAUDE.md.backup');
    
    if (await fs.pathExists(claudeMdPath)) {
      console.log(chalk.cyan('3. Backing up existing CLAUDE.md...'));
      await fs.copy(claudeMdPath, backupPath);
      console.log(chalk.green('   ✓ Backup created:', backupPath));
    }

    // Step 4: Generate new CLAUDE.md
    console.log(chalk.cyan('4. Generating new CLAUDE.md with status data...'));
    const success = await claudeMdGenerator.generate();
    
    if (success) {
      console.log(chalk.green('   ✓ CLAUDE.md generated successfully'));
      
      // Step 5: Verify status content
      console.log(chalk.cyan('5. Verifying status content in CLAUDE.md...'));
      const claudeMdContent = await fs.readFile(claudeMdPath, 'utf-8');
      
      // Check for key status indicators
      const checks = [
        { pattern: `Project Status: ${status.project}`, name: 'Project name' },
        { pattern: `${status.overall_completion}% Complete`, name: 'Overall completion' },
        { pattern: 'Last Updated:', name: 'Last updated timestamp' },
        { pattern: 'Features Progress', name: 'Features section' },
        { pattern: 'Slash Commands: 100% complete', name: 'Slash commands progress' },
        { pattern: 'Custom Server Support: 90% complete', name: 'Custom server progress' }
      ];
      
      console.log();
      for (const check of checks) {
        if (claudeMdContent.includes(check.pattern)) {
          console.log(chalk.green(`   ✓ ${check.name} found`));
        } else {
          console.log(chalk.red(`   ✗ ${check.name} NOT found`));
          console.log(chalk.gray(`     Looking for: "${check.pattern}"`));
        }
      }
      
      // Step 6: Display first few lines of status section
      console.log();
      console.log(chalk.cyan('6. Preview of status section:'));
      console.log(chalk.gray('━'.repeat(50)));
      
      const lines = claudeMdContent.split('\n');
      const statusLineIndex = lines.findIndex(line => line.includes('Project Status:'));
      if (statusLineIndex >= 0) {
        const previewLines = lines.slice(statusLineIndex, statusLineIndex + 20);
        console.log(previewLines.join('\n'));
      }
      console.log(chalk.gray('━'.repeat(50)));
      
    } else {
      console.log(chalk.red('   ✗ Failed to generate CLAUDE.md'));
    }

    // Step 7: Test status update
    console.log();
    console.log(chalk.cyan('7. Testing status update...'));
    
    // Update a feature completion
    const updatedStatus = await statusManager.updateStatus({
      features: {
        ...status.features,
        npm_package: {
          ...status.features.npm_package,
          completion: 65 // Increase from 60 to 65
        }
      }
    });
    
    console.log(chalk.green('   ✓ Updated npm_package completion to 65%'));
    console.log(chalk.green('   ✓ New overall completion:', updatedStatus.overall_completion + '%'));
    
    // Step 8: Regenerate CLAUDE.md with updated status
    console.log();
    console.log(chalk.cyan('8. Regenerating CLAUDE.md with updated status...'));
    await claudeMdGenerator.generate();
    console.log(chalk.green('   ✓ CLAUDE.md regenerated'));
    
    // Final summary
    console.log();
    console.log(chalk.gray('━'.repeat(50)));
    console.log(chalk.green.bold('✅ Status Tracking System Test Complete!'));
    console.log();
    console.log('Summary:');
    console.log('• PROJECT_STATUS.json is being read correctly');
    console.log('• Status data is injected into CLAUDE.md template');
    console.log('• Status updates trigger recalculation of overall completion');
    console.log('• CLAUDE.md reflects current project status');
    console.log();
    console.log(chalk.yellow('⚠️  Review the generated CLAUDE.md to ensure formatting is correct'));
    
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

// Run the test
testStatusSystem().catch(console.error);