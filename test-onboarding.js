#!/usr/bin/env node

/**
 * Test script for the onboarding flow
 * Run this to verify all components work together
 */

import { OnboardingWizard } from './lib/onboarding-wizard.js';
import { PersonalityManager } from './lib/personality-manager.js';
import { ConfigManager } from './lib/config-manager.js';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

async function testOnboarding() {
  console.log(chalk.bold.cyan('\n🧪 Testing MCP-Helper Onboarding Flow\n'));
  
  try {
    // Step 1: Test PersonalityManager template loading
    console.log(chalk.bold('1. Testing PersonalityManager templates...'));
    const personalityManager = new PersonalityManager();
    await personalityManager.initialize();
    
    const templates = await personalityManager.loadTemplates();
    console.log(`  ✓ Loaded ${templates.length} personality templates`);
    
    // Verify each template
    for (const template of templates) {
      console.log(`  ✓ Template: ${template.name} (${template.id})`);
    }
    
    // Test applying a template
    const testTemplate = 'balanced-friendly';
    const preferences = await personalityManager.applyTemplate(testTemplate);
    console.log(`  ✓ Applied '${testTemplate}' template successfully`);
    
    // Step 2: Test ConfigManager
    console.log(chalk.bold('\n2. Testing ConfigManager...'));
    const configManager = new ConfigManager();
    
    // Check if config exists
    const configPath = path.join(os.homedir(), '.claude.json');
    const hasConfig = await fs.pathExists(configPath);
    console.log(`  ${hasConfig ? '✓' : '✗'} Config exists at: ${configPath}`);
    
    // Step 3: Test environment detection
    console.log(chalk.bold('\n3. Testing environment detection...'));
    const envPath = path.join(process.cwd(), '.env');
    const hasEnv = await fs.pathExists(envPath);
    console.log(`  ${hasEnv ? '✓' : '✗'} .env file exists`);
    
    // Step 4: Test server cards loading
    console.log(chalk.bold('\n4. Testing server cards...'));
    const { ServerCardsManager } = await import('./lib/server-cards.js');
    const serverCards = new ServerCardsManager();
    await serverCards.initialize();
    
    const cards = serverCards.getAllCards();
    console.log(`  ✓ Loaded ${cards.length} server cards`);
    
    // List available cards
    const sampleCards = cards.slice(0, 5);
    sampleCards.forEach(card => {
      const desc = card.description || 'No description';
      console.log(`  ✓ ${card.id}: ${desc.substring(0, 50)}...`);
    });
    
    // Step 5: Test project analyzer
    console.log(chalk.bold('\n5. Testing project analyzer...'));
    const { ProjectAnalyzer } = await import('./lib/project-analyzer.js');
    const projectAnalyzer = new ProjectAnalyzer();
    
    const analysis = await projectAnalyzer.analyze(process.cwd());
    console.log(`  ✓ Project type: ${analysis.projectType || 'Unknown'}`);
    console.log(`  ✓ Confidence: ${Math.round(analysis.confidence * 100)}%`);
    if (analysis.technologies && analysis.technologies.length > 0) {
      console.log(`  ✓ Technologies: ${analysis.technologies.join(', ')}`);
    }
    
    // Step 6: Test advisory engine
    console.log(chalk.bold('\n6. Testing advisory engine...'));
    const { AdvisoryEngine } = await import('./lib/advisory-engine.js');
    const advisoryEngine = new AdvisoryEngine();
    
    const advice = await advisoryEngine.getAdvice({
      projectPath: process.cwd()
    });
    
    console.log(`  ✓ Generated ${advice.recommendations.length} recommendations`);
    advice.recommendations.slice(0, 3).forEach(rec => {
      console.log(`  - ${rec.serverName}: ${rec.reason}`);
    });
    
    // Step 7: Test response formatter
    console.log(chalk.bold('\n7. Testing response formatter...'));
    const { ResponseFormatter } = await import('./lib/response-formatter.js');
    const responseFormatter = new ResponseFormatter(personalityManager);
    
    const formattedMessage = await responseFormatter.format(
      'Test message for formatting',
      { type: 'success' }
    );
    console.log(`  ✓ Formatted: ${formattedMessage}`);
    
    // Step 8: Test legacy config merger
    console.log(chalk.bold('\n8. Testing legacy config merger...'));
    const { LegacyConfigMerger } = await import('./lib/legacy-config-merger.js');
    const legacyMerger = new LegacyConfigMerger();
    
    const configExists = await legacyMerger.hasExistingConfig();
    console.log(`  ${configExists ? '✓' : '✗'} Existing config detection: ${configExists}`);
    
    if (configExists) {
      const analysis = await legacyMerger.analyzeExistingConfig();
      console.log(`  ✓ Found ${analysis.serverCount} existing servers`);
    }
    
    // Summary
    console.log(chalk.bold.green('\n✅ All components tested successfully!\n'));
    
    // Optional: Run interactive onboarding
    const { runInteractive } = await askToRunInteractive();
    if (runInteractive) {
      console.log(chalk.bold.cyan('\n🚀 Starting interactive onboarding...\n'));
      const wizard = new OnboardingWizard();
      await wizard.run({ test: true });
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'));
    console.error(error);
    process.exit(1);
  }
}

async function askToRunInteractive() {
  // For automated testing, return false
  // For manual testing, you could use inquirer here
  return { runInteractive: false };
}

// Run the test
testOnboarding().catch(console.error);