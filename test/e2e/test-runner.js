#!/usr/bin/env node

/**
 * E2E Test Runner for MCP-Helper
 * MVP-level testing using Node.js built-in test capabilities
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');

// Test utilities
class TestRunner {
  constructor() {
    this.tempDir = null;
    this.results = [];
  }

  async setup() {
    // Create temp directory for test isolation
    this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-helper-test-'));
    process.chdir(this.tempDir);
    
    // Copy necessary files
    await this.copyTestAssets();
  }

  async teardown() {
    if (this.tempDir) {
      process.chdir(projectRoot);
      await fs.rm(this.tempDir, { recursive: true, force: true });
    }
  }

  async copyTestAssets() {
    // Create a minimal package.json for project detection
    await fs.writeFile(path.join(this.tempDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0'
    }, null, 2));
  }

  async runCommand(command, args = []) {
    return new Promise((resolve) => {
      const cmdPath = path.join(projectRoot, 'cli', 'index.js');
      const proc = spawn('node', [cmdPath, command, ...args], {
        cwd: this.tempDir,
        env: { ...process.env, DEBUG: 'false' }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      // Handle interactive input if needed
      setTimeout(() => {
        proc.stdin.write('\n');
        proc.stdin.end();
      }, 100);
    });
  }

  async test(name, fn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      await fn();
      console.log(`  ✅ PASSED`);
      this.results.push({ name, passed: true });
    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}`);
      this.results.push({ name, passed: false, error: error.message });
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    
    console.log(`Total: ${this.results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
    
    return failed === 0;
  }
}

// Main test suite
async function runTests() {
  const runner = new TestRunner();
  
  try {
    await runner.setup();

    // Test: Help command
    await runner.test('Help command shows available commands', async () => {
      const result = await runner.runCommand('help');
      assert(result.stdout.includes('MCP-Helper'), 'Should show MCP-Helper title');
      assert(result.stdout.includes('Available Commands'), 'Should list commands');
      assert(result.code === 0, 'Should exit with code 0');
    });

    // Test: Init command
    await runner.test('Init command creates .env file', async () => {
      const result = await runner.runCommand('init');
      assert(result.stdout.includes('Detected'), 'Should detect project type');
      
      const envExists = await fs.access(path.join(runner.tempDir, '.env'))
        .then(() => true)
        .catch(() => false);
      assert(envExists, '.env file should be created');
    });

    // Test: List command
    await runner.test('List command shows server catalog', async () => {
      const result = await runner.runCommand('list');
      assert(result.stdout.includes('github') || result.stdout.includes('GitHub'), 'Should show GitHub server');
      assert(result.stdout.includes('serena') || result.stdout.includes('Serena'), 'Should show Serena server');
    });

    // Test: Add command validation
    await runner.test('Add command requires server name', async () => {
      const result = await runner.runCommand('add');
      assert(result.stdout.includes('required') || result.stderr.includes('required'), 
        'Should show error for missing server name');
    });

    // Test: Reconfigure command validation
    await runner.test('Reconfigure command requires server name', async () => {
      const result = await runner.runCommand('reconfigure');
      assert(result.stdout.includes('required') || result.stderr.includes('required'),
        'Should show error for missing server name');
    });

    // Test: Unknown command handling
    await runner.test('Unknown command shows suggestions', async () => {
      const result = await runner.runCommand('unknown-cmd');
      assert(result.stdout.includes('Unknown command') || result.stderr.includes('Unknown command'),
        'Should show unknown command error');
      assert(result.stdout.includes('Did you mean'), 'Should show suggestions');
    });

    // Test: Command with --help flag
    await runner.test('Commands support --help flag', async () => {
      const result = await runner.runCommand('init', ['--help']);
      assert(result.stdout.includes('Usage'), 'Should show usage information');
      assert(result.stdout.includes('Examples'), 'Should show examples');
    });

    // Test: Color output (basic check)
    await runner.test('Commands use colored output', async () => {
      const result = await runner.runCommand('init');
      // Check for ANSI color codes
      assert(result.stdout.includes('\x1b['), 'Should contain ANSI color codes');
    });

  } finally {
    await runner.teardown();
  }

  return runner.printSummary();
}

// Run tests
console.log('🚀 Starting MCP-Helper E2E Tests (MVP Level)\n');
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});