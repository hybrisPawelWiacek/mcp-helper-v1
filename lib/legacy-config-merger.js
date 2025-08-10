/**
 * Legacy Config Merger for MCP Helper
 * Handles existing MCP configurations and merges them with new ones
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { diffLines } from 'diff';

export class LegacyConfigMerger {
  constructor(configManager) {
    this.configManager = configManager;
    this.claudeJsonPath = path.join(os.homedir(), '.claude.json');
    this.backupDir = path.join(os.homedir(), '.mcp-helper', 'backups');
    this.existingConfig = null;
    this.conflicts = [];
  }

  /**
   * Check for existing MCP configuration
   */
  async checkExistingConfig() {
    const result = {
      hasConfig: false,
      configPath: null,
      serverCount: 0,
      servers: [],
      hasEnvFile: false,
      envPath: null,
      backupCreated: false
    };
    
    // Check for ~/.claude.json
    if (await fs.pathExists(this.claudeJsonPath)) {
      result.hasConfig = true;
      result.configPath = this.claudeJsonPath;
      
      try {
        this.existingConfig = await fs.readJson(this.claudeJsonPath);
        
        if (this.existingConfig.mcpServers) {
          result.servers = Object.keys(this.existingConfig.mcpServers);
          result.serverCount = result.servers.length;
        }
      } catch (error) {
        console.error('Error reading existing config:', error);
      }
    }
    
    // Check for local .env file
    const localEnvPath = path.join(process.cwd(), '.env');
    if (await fs.pathExists(localEnvPath)) {
      result.hasEnvFile = true;
      result.envPath = localEnvPath;
    }
    
    return result;
  }

  /**
   * Analyze existing configuration for potential conflicts
   */
  async analyzeConfig() {
    if (!this.existingConfig) {
      return {
        hasConflicts: false,
        conflicts: [],
        recommendations: []
      };
    }
    
    const analysis = {
      hasConflicts: false,
      conflicts: [],
      recommendations: [],
      statistics: {
        totalServers: 0,
        npxServers: 0,
        dockerServers: 0,
        uvxServers: 0,
        httpServers: 0,
        customServers: 0,
        recognizedServers: 0,
        unrecognizedServers: 0
      }
    };
    
    if (this.existingConfig.mcpServers) {
      const servers = this.existingConfig.mcpServers;
      analysis.statistics.totalServers = Object.keys(servers).length;
      
      for (const [name, config] of Object.entries(servers)) {
        // Categorize servers
        if (config.command === 'npx') {
          analysis.statistics.npxServers++;
        } else if (config.command === 'docker') {
          analysis.statistics.dockerServers++;
        } else if (config.command === 'uvx') {
          analysis.statistics.uvxServers++;
        } else if (config.url) {
          analysis.statistics.httpServers++;
        } else {
          analysis.statistics.customServers++;
        }
        
        // Check if server is in our catalog
        const isRecognized = await this.isRecognizedServer(name);
        if (isRecognized) {
          analysis.statistics.recognizedServers++;
        } else {
          analysis.statistics.unrecognizedServers++;
          analysis.recommendations.push({
            type: 'unrecognized',
            server: name,
            message: `Server "${name}" is not in our catalog. Consider documenting it with /mcp-helper add-custom`
          });
        }
        
        // Check for potential issues
        if (config.command && !config.args) {
          analysis.conflicts.push({
            type: 'missing-args',
            server: name,
            message: `Server "${name}" has a command but no args`
          });
          analysis.hasConflicts = true;
        }
        
        if (config.url && !config.url.startsWith('http')) {
          analysis.conflicts.push({
            type: 'invalid-url',
            server: name,
            message: `Server "${name}" has an invalid URL: ${config.url}`
          });
          analysis.hasConflicts = true;
        }
      }
    }
    
    // Add recommendations based on analysis
    if (analysis.statistics.unrecognizedServers > 0) {
      analysis.recommendations.push({
        type: 'catalog',
        message: `You have ${analysis.statistics.unrecognizedServers} custom servers. Consider documenting them for better management.`
      });
    }
    
    if (analysis.statistics.totalServers > 15) {
      analysis.recommendations.push({
        type: 'optimization',
        message: 'You have many servers configured. Consider organizing them by project or use case.'
      });
    }
    
    return analysis;
  }

  /**
   * Check if a server is in our catalog
   */
  async isRecognizedServer(serverName) {
    // This would check against the server cards catalog
    // For now, we'll check against a known list
    const knownServers = [
      'github-official', 'serena', 'context7', 'sequentialthinking',
      'memory', 'postgres', 'firecrawl', 'brave-search', 'perplexity-ask',
      'slack', 'notion', 'atlassian', 'puppeteer', 'playwright',
      'docker-mcp-toolkit', 'claude-code', 'openmemory', 'linkedin-mcp-server'
    ];
    
    return knownServers.includes(serverName);
  }

  /**
   * Create backup of existing configuration
   */
  async createBackup() {
    if (!this.existingConfig) {
      return null;
    }
    
    await fs.ensureDir(this.backupDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `claude-json-${timestamp}.backup`);
    
    await fs.writeJson(backupPath, this.existingConfig, { spaces: 2 });
    
    // Also create a 'latest' symlink for easy access
    const latestPath = path.join(this.backupDir, 'claude-json-latest.backup');
    if (await fs.pathExists(latestPath)) {
      await fs.remove(latestPath);
    }
    await fs.copy(backupPath, latestPath);
    
    return backupPath;
  }

  /**
   * Merge new server configuration with existing
   */
  async mergeServerConfig(serverName, newConfig, strategy = 'preserve') {
    if (!this.existingConfig) {
      // No existing config, just use the new one
      return newConfig;
    }
    
    const existing = this.existingConfig.mcpServers?.[serverName];
    
    if (!existing) {
      // Server doesn't exist, add it
      return newConfig;
    }
    
    // Server exists, apply merge strategy
    switch (strategy) {
      case 'preserve':
        // Keep existing config
        return existing;
        
      case 'overwrite':
        // Use new config
        return newConfig;
        
      case 'merge':
        // Merge configs, preferring new values for conflicts
        return this.deepMerge(existing, newConfig);
        
      case 'interactive':
        // Would prompt user for each conflict
        // For now, fallback to merge
        return this.deepMerge(existing, newConfig);
        
      default:
        return existing;
    }
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get merge strategy recommendation
   */
  getMergeStrategy(serverName) {
    const existing = this.existingConfig?.mcpServers?.[serverName];
    
    if (!existing) {
      return {
        strategy: 'add',
        reason: 'Server does not exist in current configuration'
      };
    }
    
    // Check if existing config is likely custom
    const hasMetadata = existing.metadata?.source === 'mcp-helper';
    
    if (hasMetadata) {
      return {
        strategy: 'overwrite',
        reason: 'Server was previously configured by mcp-helper'
      };
    }
    
    return {
      strategy: 'preserve',
      reason: 'Server appears to be manually configured'
    };
  }

  /**
   * Generate a diff of configuration changes
   */
  generateDiff(oldConfig, newConfig) {
    const oldJson = JSON.stringify(oldConfig, null, 2);
    const newJson = JSON.stringify(newConfig, null, 2);
    
    const diff = diffLines(oldJson, newJson);
    
    let diffOutput = '';
    diff.forEach(part => {
      if (part.added) {
        diffOutput += part.value.split('\n').map(line => `+ ${line}`).join('\n');
      } else if (part.removed) {
        diffOutput += part.value.split('\n').map(line => `- ${line}`).join('\n');
      }
    });
    
    return diffOutput;
  }

  /**
   * Get migration recommendations
   */
  getMigrationRecommendations() {
    if (!this.existingConfig) {
      return [];
    }
    
    const recommendations = [];
    
    // Check for servers without metadata
    if (this.existingConfig.mcpServers) {
      for (const [name, config] of Object.entries(this.existingConfig.mcpServers)) {
        if (!config.metadata) {
          recommendations.push({
            server: name,
            action: 'add-metadata',
            reason: 'Server lacks metadata for tracking',
            priority: 'low'
          });
        }
        
        // Check for outdated configurations
        if (config.command === 'npx' && config.args?.[0]?.includes('@modelcontextprotocol')) {
          const packageName = config.args[0];
          if (packageName.includes('github-mcp')) {
            recommendations.push({
              server: name,
              action: 'update-package',
              reason: 'Using old package name, should be @github/mcp-server-github',
              priority: 'medium'
            });
          }
        }
      }
    }
    
    // Check for missing essential servers
    const essentialServers = ['serena', 'sequentialthinking', 'memory'];
    const existingServers = Object.keys(this.existingConfig.mcpServers || {});
    
    for (const essential of essentialServers) {
      if (!existingServers.includes(essential)) {
        recommendations.push({
          server: essential,
          action: 'add-server',
          reason: `Essential server "${essential}" is not configured`,
          priority: 'high'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Apply migration to existing configuration
   */
  async applyMigration(options = {}) {
    const {
      preserveCustom = true,
      addMetadata = true,
      updatePackages = false,
      dryRun = false
    } = options;
    
    if (!this.existingConfig) {
      return {
        success: false,
        message: 'No existing configuration to migrate'
      };
    }
    
    // Create backup first
    if (!dryRun) {
      const backupPath = await this.createBackup();
      console.log(`Backup created: ${backupPath}`);
    }
    
    const migrated = JSON.parse(JSON.stringify(this.existingConfig));
    const changes = [];
    
    if (migrated.mcpServers) {
      for (const [name, config] of Object.entries(migrated.mcpServers)) {
        // Add metadata if missing
        if (addMetadata && !config.metadata) {
          config.metadata = {
            source: 'migrated',
            migratedAt: new Date().toISOString(),
            originalSource: 'manual'
          };
          changes.push(`Added metadata to ${name}`);
        }
        
        // Update outdated packages
        if (updatePackages && config.command === 'npx') {
          if (config.args?.[0]?.includes('github-mcp')) {
            config.args[0] = '@github/mcp-server-github';
            changes.push(`Updated package name for ${name}`);
          }
        }
      }
    }
    
    if (dryRun) {
      return {
        success: true,
        message: 'Dry run complete',
        changes,
        migrated
      };
    }
    
    // Apply the migration
    await fs.writeJson(this.claudeJsonPath, migrated, { spaces: 2 });
    
    return {
      success: true,
      message: 'Migration applied successfully',
      changes,
      backupPath: path.join(this.backupDir, 'claude-json-latest.backup')
    };
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath = null) {
    if (!backupPath) {
      backupPath = path.join(this.backupDir, 'claude-json-latest.backup');
    }
    
    if (!await fs.pathExists(backupPath)) {
      return {
        success: false,
        message: `Backup not found: ${backupPath}`
      };
    }
    
    const backup = await fs.readJson(backupPath);
    await fs.writeJson(this.claudeJsonPath, backup, { spaces: 2 });
    
    return {
      success: true,
      message: 'Configuration restored from backup',
      backupPath
    };
  }

  /**
   * Get summary of existing configuration
   */
  getSummary() {
    if (!this.existingConfig) {
      return {
        hasConfig: false,
        message: 'No existing MCP configuration found'
      };
    }
    
    const servers = this.existingConfig.mcpServers || {};
    const serverList = Object.keys(servers);
    
    return {
      hasConfig: true,
      serverCount: serverList.length,
      servers: serverList,
      categories: this.categorizeServers(servers),
      health: this.assessConfigHealth(servers)
    };
  }

  /**
   * Categorize servers by type
   */
  categorizeServers(servers) {
    const categories = {
      development: [],
      collaboration: [],
      automation: [],
      research: [],
      custom: []
    };
    
    for (const [name, config] of Object.entries(servers)) {
      if (['serena', 'github-official', 'context7'].includes(name)) {
        categories.development.push(name);
      } else if (['slack', 'notion', 'atlassian'].includes(name)) {
        categories.collaboration.push(name);
      } else if (['puppeteer', 'playwright', 'docker-mcp-toolkit'].includes(name)) {
        categories.automation.push(name);
      } else if (['brave-search', 'perplexity-ask', 'firecrawl'].includes(name)) {
        categories.research.push(name);
      } else {
        categories.custom.push(name);
      }
    }
    
    return categories;
  }

  /**
   * Assess configuration health
   */
  assessConfigHealth(servers) {
    let score = 100;
    const issues = [];
    
    // Check for missing metadata
    const withoutMetadata = Object.entries(servers)
      .filter(([_, config]) => !config.metadata)
      .map(([name]) => name);
    
    if (withoutMetadata.length > 0) {
      score -= 10;
      issues.push(`${withoutMetadata.length} servers lack metadata`);
    }
    
    // Check for potential duplicates
    const commands = {};
    for (const [name, config] of Object.entries(servers)) {
      const key = `${config.command}-${JSON.stringify(config.args)}`;
      if (commands[key]) {
        score -= 5;
        issues.push(`Potential duplicate: ${name} and ${commands[key]}`);
      } else {
        commands[key] = name;
      }
    }
    
    // Check for essential servers
    const essentials = ['serena', 'sequentialthinking', 'memory'];
    const missing = essentials.filter(e => !servers[e]);
    if (missing.length > 0) {
      score -= missing.length * 10;
      issues.push(`Missing essential servers: ${missing.join(', ')}`);
    }
    
    return {
      score: Math.max(0, score),
      status: score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'needs-attention',
      issues
    };
  }
}

export default LegacyConfigMerger;