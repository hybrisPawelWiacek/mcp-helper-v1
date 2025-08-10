#!/usr/bin/env node

/**
 * Test script for slash commands
 * Simulates how Claude Code would execute these commands
 */

import { handleSlashCommand } from './slash-commands/index.js';

async function testCommand(input) {
  console.log(`\n📝 Testing: ${input}`);
  console.log('─'.repeat(50));
  
  try {
    const result = await handleSlashCommand(input);
    
    if (result.success) {
      console.log('✅ Success!');
      console.log('\n📨 Response:');
      console.log(result.message);
      
      if (result.commands) {
        console.log('\nAvailable commands:');
        result.commands.forEach(cmd => {
          console.log(`  ${cmd.command} - ${cmd.description}`);
        });
      }
      
      if (result.quickStart) {
        console.log(`\n${result.quickStart.title}`);
        result.quickStart.steps.forEach(step => console.log(`  ${step}`));
      }
    } else {
      console.log('❌ Failed!');
      console.log(result.message);
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

// Test various commands
async function runTests() {
  console.log('🧪 Testing MCP-Helper Slash Commands');
  console.log('═'.repeat(50));
  
  // Test help command
  await testCommand('/mcp-helper help');
  
  // Test invalid command
  await testCommand('/mcp-helper invalid');
  
  // Test help with specific command
  await testCommand('/mcp-helper help add');
  
  // Test add without arguments
  await testCommand('/mcp-helper add');
  
  console.log('\n✨ Tests complete!');
}

runTests().catch(console.error);