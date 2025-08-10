/**
 * /mcp-helper reconfigure - Reconfigure an existing MCP server
 * 
 * This slash command handler modifies the configuration of an existing MCP server
 * within the Claude Code chat interface.
 */

export default {
  name: 'reconfigure',
  description: 'Modify an existing server configuration',
  usage: '/mcp-helper reconfigure <server-name>',
  
  /**
   * Execute the reconfigure command
   * @param {Object} context - Command context with utilities
   * @returns {Promise<Object>} - Execution result
   */
  async execute(context) {
    const { configManager, serverCards, claudeMdGenerator, args } = context;
    
    // Check if server name was provided
    if (args.length === 0) {
      return {
        message: '❌ Please specify a server to reconfigure',
        usage: this.usage,
        hint: 'Use `/mcp-helper list` to see configured servers'
      };
    }
    
    const serverName = args[0];
    
    try {
      // Load current config
      const config = await configManager.loadConfig();
      
      // Check if server exists
      if (!config.mcpServers?.[serverName]) {
        return {
          message: `❌ Server "${serverName}" is not configured`,
          hint: `Use \`/mcp-helper add ${serverName}\` to add it first`,
          configured: Object.keys(config.mcpServers || {})
        };
      }
      
      // Get current configuration
      const currentConfig = config.mcpServers[serverName];
      
      // Try to load server card for updated information
      const serverCard = await serverCards.getServerCard(serverName);
      
      if (serverCard) {
        // Update with latest server card configuration
        const updatedConfig = this.mergeConfigurations(currentConfig, serverCard);
        
        // Show what will change
        const changes = this.detectChanges(currentConfig, updatedConfig);
        
        if (changes.length === 0) {
          return {
            message: `ℹ️ Server "${serverName}" is already up to date`,
            currentConfig,
            hint: 'No changes needed based on the latest server card'
          };
        }
        
        // Apply changes
        await configManager.updateServer(serverName, updatedConfig);
        
        // Update CLAUDE.md
        const newConfig = await configManager.loadConfig();
        await claudeMdGenerator.generate(newConfig);
        
        return {
          message: `✅ Successfully reconfigured "${serverName}"`,
          changes: changes.map(c => `• ${c}`),
          updatedConfig,
          envVars: serverCard.envSchema ? {
            message: '📝 Environment variables for this server:',
            variables: Object.entries(serverCard.envSchema).map(([name, schema]) => ({
              name,
              description: schema.description,
              required: schema.required,
              current: process.env[name] ? '✅ Set' : '❌ Not set'
            }))
          } : null,
          nextSteps: [
            'Restart Claude Code to apply changes',
            `Test with: claude "Using ${serverName}, ..."`
          ]
        };
      } else {
        // Custom server - show current config and allow manual updates
        return {
          message: `⚠️ "${serverName}" is a custom server`,
          currentConfig,
          hint: 'Custom servers must be reconfigured manually',
          instructions: [
            '1. Edit ~/.claude.json directly',
            '2. Modify the server configuration under mcpServers',
            '3. Restart Claude Code to apply changes'
          ],
          example: {
            message: 'Example configuration structure:',
            config: {
              command: 'command-name',
              args: ['arg1', 'arg2'],
              env: {
                ENV_VAR: 'value'
              }
            }
          }
        };
      }
    } catch (error) {
      return {
        message: `❌ Failed to reconfigure server: ${error.message}`,
        error: error.stack
      };
    }
  },
  
  /**
   * Merge current configuration with server card updates
   */
  mergeConfigurations(current, serverCard) {
    const transport = serverCard.transports[0];
    const updated = { ...current };
    
    // Update based on transport type
    if (transport === 'stdio') {
      if (serverCard.runtime === 'npx') {
        updated.command = 'npx';
        updated.args = [serverCard.npmPackage || serverCard.name];
      } else if (serverCard.runtime === 'docker') {
        updated.command = 'docker';
        const baseArgs = ['run', '-i', '--rm'];
        
        // Preserve existing environment variable mappings
        const existingEnvArgs = [];
        if (current.args) {
          for (let i = 0; i < current.args.length - 1; i++) {
            if (current.args[i] === '-e') {
              existingEnvArgs.push('-e', current.args[i + 1]);
              i++; // Skip the next arg
            }
          }
        }
        
        // Add new environment variables from server card
        const newEnvArgs = [];
        if (serverCard.envSchema) {
          Object.keys(serverCard.envSchema).forEach(envVar => {
            const exists = existingEnvArgs.some((arg, idx) => 
              arg === '-e' && existingEnvArgs[idx + 1]?.startsWith(`${envVar}=`)
            );
            if (!exists) {
              newEnvArgs.push('-e', `${envVar}=$${envVar}`);
            }
          });
        }
        
        // Combine arguments
        updated.args = [...baseArgs, ...existingEnvArgs, ...newEnvArgs, serverCard.dockerImage || serverCard.name];
      } else if (serverCard.runtime === 'uvx') {
        updated.command = 'uvx';
        updated.args = [serverCard.uvPackage || serverCard.name];
      }
    } else if (transport === 'http' || transport === 'sse') {
      updated.url = serverCard.defaultUrl || updated.url || `http://localhost:${serverCard.defaultPort || 3000}`;
      if (serverCard.headers) {
        updated.headers = { ...updated.headers, ...serverCard.headers };
      }
    }
    
    // Update metadata
    updated.metadata = {
      ...updated.metadata,
      source: 'mcp-helper',
      updatedAt: new Date().toISOString(),
      serverCard: serverCard.name,
      version: serverCard.version
    };
    
    return updated;
  },
  
  /**
   * Detect changes between configurations
   */
  detectChanges(current, updated) {
    const changes = [];
    
    // Check command changes
    if (current.command !== updated.command) {
      changes.push(`Command: ${current.command} → ${updated.command}`);
    }
    
    // Check args changes
    const currentArgs = JSON.stringify(current.args || []);
    const updatedArgs = JSON.stringify(updated.args || []);
    if (currentArgs !== updatedArgs) {
      changes.push('Arguments updated');
    }
    
    // Check URL changes
    if (current.url !== updated.url) {
      changes.push(`URL: ${current.url} → ${updated.url}`);
    }
    
    // Check metadata
    if (updated.metadata?.version && current.metadata?.version !== updated.metadata.version) {
      changes.push(`Version: ${current.metadata?.version || 'unknown'} → ${updated.metadata.version}`);
    }
    
    return changes;
  }
};