/**
 * Configuration Manager for MCP Helper
 * Handles global (~/.claude.json) and project (.env) configurations
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

export class ConfigManager {
  constructor() {
    this.globalConfigPath = path.join(os.homedir(), '.claude.json');
    this.globalEnvPath = path.join(os.homedir(), '.claude-env');
    this.projectEnvPath = path.join(process.cwd(), '.env');
    this.backupDir = path.join(os.homedir(), '.mcp-helper', 'backups');
  }

  /**
   * Read global Claude configuration
   */
  async readGlobalConfig() {
    try {
      if (await fs.pathExists(this.globalConfigPath)) {
        return await fs.readJson(this.globalConfigPath);
      }
      return { mcpServers: {} };
    } catch (error) {
      console.error('Error reading global config:', error);
      return { mcpServers: {} };
    }
  }

  /**
   * Write global Claude configuration
   */
  async writeGlobalConfig(config) {
    try {
      // Create backup before writing
      await this.backupConfig(this.globalConfigPath);
      await fs.writeJson(this.globalConfigPath, config, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error writing global config:', error);
      return false;
    }
  }

  /**
   * Read project environment variables
   */
  async readProjectEnv() {
    try {
      if (await fs.pathExists(this.projectEnvPath)) {
        const envContent = await fs.readFile(this.projectEnvPath, 'utf-8');
        return dotenv.parse(envContent);
      }
      return {};
    } catch (error) {
      console.error('Error reading project env:', error);
      return {};
    }
  }

  /**
   * Write project environment variables
   */
  async writeProjectEnv(envVars) {
    try {
      // Create backup before writing
      if (await fs.pathExists(this.projectEnvPath)) {
        await this.backupConfig(this.projectEnvPath);
      }

      // Read existing env
      const existingEnv = await this.readProjectEnv();
      const mergedEnv = { ...existingEnv, ...envVars };

      // Format env content
      let envContent = '';
      for (const [key, value] of Object.entries(mergedEnv)) {
        envContent += `export ${key}="${value}"\n`;
      }

      await fs.writeFile(this.projectEnvPath, envContent);
      return true;
    } catch (error) {
      console.error('Error writing project env:', error);
      return false;
    }
  }

  /**
   * Add MCP server to global configuration
   */
  async addServerGlobal(serverId, serverConfig) {
    const config = await this.readGlobalConfig();
    
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    config.mcpServers[serverId] = serverConfig;
    
    return await this.writeGlobalConfig(config);
  }

  /**
   * Add MCP server to project (via .env overrides)
   */
  async addServerProject(serverId, envVars) {
    // For project-local servers, we primarily manage environment variables
    // The actual server config still goes in global, but with env var references
    return await this.writeProjectEnv(envVars);
  }

  /**
   * Check if server is configured
   */
  async isServerConfigured(serverId, scope = 'global') {
    if (scope === 'global') {
      const config = await this.readGlobalConfig();
      return config.mcpServers && config.mcpServers[serverId];
    } else {
      // For project scope, check if relevant env vars exist
      const envVars = await this.readProjectEnv();
      // This is simplified - would need server card to know which vars to check
      return Object.keys(envVars).length > 0;
    }
  }

  /**
   * List configured servers
   */
  async listServers() {
    const globalConfig = await this.readGlobalConfig();
    const projectEnv = await this.readProjectEnv();

    const servers = [];

    // Add global servers
    if (globalConfig.mcpServers) {
      for (const [id, config] of Object.entries(globalConfig.mcpServers)) {
        servers.push({
          id,
          scope: 'global',
          config,
          hasProjectOverrides: this.hasEnvOverrides(config, projectEnv)
        });
      }
    }

    return servers;
  }

  /**
   * Check if server config has environment overrides
   */
  hasEnvOverrides(serverConfig, projectEnv) {
    // Check if any env vars in the server config are overridden in project
    const configStr = JSON.stringify(serverConfig);
    const envVarPattern = /\$\{([^}]+)\}/g;
    const matches = configStr.match(envVarPattern);
    
    if (matches) {
      for (const match of matches) {
        const varName = match.slice(2, -1); // Remove ${ and }
        if (projectEnv[varName]) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Create backup of configuration
   */
  async backupConfig(configPath) {
    try {
      await fs.ensureDir(this.backupDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.basename(configPath);
      const backupPath = path.join(this.backupDir, `${filename}.${timestamp}`);
      
      if (await fs.pathExists(configPath)) {
        await fs.copy(configPath, backupPath);
      }
      
      // Keep only last 10 backups
      await this.cleanupBackups(filename);
      
      return backupPath;
    } catch (error) {
      console.error('Error creating backup:', error);
      return null;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupBackups(filename) {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(f => f.startsWith(filename))
        .sort()
        .reverse();
      
      // Keep only last 10 backups
      for (let i = 10; i < backups.length; i++) {
        await fs.remove(path.join(this.backupDir, backups[i]));
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath, targetPath) {
    try {
      await fs.copy(backupPath, targetPath, { overwrite: true });
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }

  /**
   * Get latest backup
   */
  async getLatestBackup(filename) {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(f => f.startsWith(filename))
        .sort()
        .reverse();
      
      if (backups.length > 0) {
        return path.join(this.backupDir, backups[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting latest backup:', error);
      return null;
    }
  }

  /**
   * Get server configuration details
   */
  async getServerConfig(serverId) {
    const globalConfig = await this.readGlobalConfig();
    const projectEnv = await this.readProjectEnv();
    
    if (!globalConfig.mcpServers || !globalConfig.mcpServers[serverId]) {
      return null;
    }
    
    const config = globalConfig.mcpServers[serverId];
    const hasProjectOverrides = this.hasEnvOverrides(config, projectEnv);
    
    // Extract environment variables used
    const configStr = JSON.stringify(config);
    const envVarPattern = /\$\{([^}]+)\}/g;
    const matches = configStr.match(envVarPattern) || [];
    
    const envVars = {};
    for (const match of matches) {
      const varName = match.slice(2, -1);
      envVars[varName] = projectEnv[varName] || process.env[varName] || null;
    }
    
    return {
      id: serverId,
      scope: hasProjectOverrides ? 'project' : 'global',
      config,
      envVars,
      hasProjectOverrides
    };
  }

  /**
   * Update server scope (migrate between global and project)
   */
  async updateServerScope(serverId, newScope) {
    const serverConfig = await this.getServerConfig(serverId);
    if (!serverConfig) {
      throw new Error(`Server ${serverId} not found`);
    }
    
    const currentScope = serverConfig.scope;
    
    if (currentScope === newScope) {
      return true; // No change needed
    }
    
    if (newScope === 'project') {
      // Moving from global to project - add env vars to project
      if (Object.keys(serverConfig.envVars).length > 0) {
        await this.writeProjectEnv(serverConfig.envVars);
      }
    } else if (newScope === 'global') {
      // Moving from project to global - remove project-specific env vars
      // This is complex as we need to identify which vars belong to this server
      // For now, we'll keep the env vars but note the scope change
      console.log('Note: Environment variables remain in .env file');
    }
    
    return true;
  }

  /**
   * Update server environment variables
   */
  async updateServerEnvVars(serverId, envVars) {
    const serverConfig = await this.getServerConfig(serverId);
    if (!serverConfig) {
      throw new Error(`Server ${serverId} not found`);
    }
    
    // Update project env file
    await this.writeProjectEnv(envVars);
    
    return true;
  }

  /**
   * Remove server configuration
   */
  async removeServer(serverId) {
    // Remove from global config
    const globalConfig = await this.readGlobalConfig();
    
    if (globalConfig.mcpServers && globalConfig.mcpServers[serverId]) {
      // Create backup before removal
      await this.backupConfig(this.globalConfigPath);
      
      delete globalConfig.mcpServers[serverId];
      await this.writeGlobalConfig(globalConfig);
    }
    
    // Note: We don't remove env vars as they might be used by other servers
    console.log('Note: Environment variables remain in .env file');
    
    return true;
  }

  /**
   * Check if a server is essential (high agentic usefulness)
   */
  async isEssentialServer(serverId, serverCardsManager) {
    const card = serverCardsManager.getCard(serverId);
    if (!card || !card.agenticUsefulness) {
      return false;
    }
    
    const { humanVerificationRating, aiAgentRating } = card.agenticUsefulness;
    return humanVerificationRating >= 4 || aiAgentRating >= 5;
  }
}

export default ConfigManager;