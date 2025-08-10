/**
 * /mcp-helper add - Add an MCP server
 * 
 * This slash command handler adds an MCP server from the catalog
 * within the Claude Code chat interface.
 */

export default {
  name: 'add',
  description: 'Add an MCP server from the catalog',
  usage: '/mcp-helper add <server-name>',
  
  /**
   * Execute the add command
   * @param {Object} context - Command context with utilities
   * @returns {Promise<Object>} - Execution result
   */
  async execute(context) {
    const { configManager, serverCards, claudeMdGenerator, args } = context;
    
    // Check if server name was provided
    if (args.length === 0) {
      return {
        message: '❌ Please specify a server to add',
        usage: this.usage,
        hint: 'Use `/mcp-helper list` to see available servers',
        availableServers: await this.getAvailableServers(serverCards)
      };
    }
    
    const serverName = args[0];
    
    try {
      // Load server card
      const serverCard = await serverCards.getCard(serverName);
      if (!serverCard) {
        return {
          message: `❌ Server "${serverName}" not found in catalog`,
          hint: 'Use `/mcp-helper list` to see available servers or `/mcp-helper add-custom` for custom servers',
          suggestions: await this.getSuggestions(serverCards, serverName)
        };
      }
      
      // Load current config
      const config = await configManager.loadConfig();
      
      // Check if already configured
      if (config.mcpServers?.[serverName]) {
        return {
          message: `⚠️ Server "${serverName}" is already configured`,
          hint: `Use \`/mcp-helper reconfigure ${serverName}\` to modify its configuration`
        };
      }
      
      // Prepare configuration based on server card
      const serverConfig = this.prepareServerConfig(serverCard);
      
      // Show configuration details
      const envVars = serverCard.envSchema ? Object.keys(serverCard.envSchema) : [];
      
      // Add to configuration
      await configManager.addServer(serverName, serverConfig);
      
      // Update CLAUDE.md
      const updatedConfig = await configManager.loadConfig();
      await claudeMdGenerator.generate(updatedConfig);
      
      return {
        message: `✅ Successfully added "${serverName}" to configuration`,
        data: {
          server: serverName,
          transport: serverCard.transports[0],
          runtime: serverCard.runtime,
          ratings: {
            human: serverCard.agenticUsefulness?.humanVerificationRating,
            agent: serverCard.agenticUsefulness?.aiAgentRating
          }
        },
        configuration: serverConfig,
        requiredEnvVars: envVars.length > 0 ? {
          message: '📝 Please set these environment variables in your .env file:',
          variables: envVars.map(v => ({
            name: v,
            description: serverCard.envSchema[v].description,
            example: serverCard.envSchema[v].example
          }))
        } : null,
        nextSteps: [
          envVars.length > 0 ? 'Add required environment variables to your .env file' : null,
          'Restart Claude Code to load the new server',
          `Test with: claude "Using ${serverName}, ..."`
        ].filter(Boolean)
      };
    } catch (error) {
      return {
        message: `❌ Failed to add server: ${error.message}`,
        error: error.stack
      };
    }
  },
  
  /**
   * Prepare server configuration from server card
   */
  prepareServerConfig(serverCard) {
    const transport = serverCard.transports[0];
    const config = {};
    
    if (transport === 'stdio') {
      if (serverCard.runtime === 'npx') {
        config.command = 'npx';
        config.args = [serverCard.npmPackage || serverCard.name];
      } else if (serverCard.runtime === 'docker') {
        config.command = 'docker';
        config.args = ['run', '-i', '--rm'];
        
        // Add environment variables
        if (serverCard.envSchema) {
          Object.keys(serverCard.envSchema).forEach(envVar => {
            config.args.push('-e', `${envVar}=$${envVar}`);
          });
        }
        
        // Add docker image
        config.args.push(serverCard.dockerImage || serverCard.name);
      } else if (serverCard.runtime === 'uvx') {
        config.command = 'uvx';
        config.args = [serverCard.uvPackage || serverCard.name];
      }
    } else if (transport === 'http' || transport === 'sse') {
      config.url = serverCard.defaultUrl || `http://localhost:${serverCard.defaultPort || 3000}`;
      if (serverCard.headers) {
        config.headers = serverCard.headers;
      }
    }
    
    // Add metadata
    config.metadata = {
      source: 'mcp-helper',
      addedAt: new Date().toISOString(),
      serverCard: serverCard.name
    };
    
    return config;
  },
  
  /**
   * Get available servers
   */
  async getAvailableServers(serverCards) {
    await serverCards.initialize();
    const cards = Array.from(serverCards.getAllCards().values());
    return cards.map(card => ({
      name: card.name,
      description: card.description,
      ratings: {
        human: card.agenticUsefulness?.humanVerificationRating,
        agent: card.agenticUsefulness?.aiAgentRating
      }
    })).slice(0, 5); // Show top 5
  },
  
  /**
   * Get suggestions for similar server names
   */
  async getSuggestions(serverCards, input) {
    await serverCards.initialize();
    const cards = Array.from(serverCards.getAllCards().values());
    const suggestions = cards
      .filter(card => 
        card.name.includes(input) || 
        card.description?.toLowerCase().includes(input.toLowerCase())
      )
      .map(card => card.name)
      .slice(0, 3);
    
    return suggestions.length > 0 ? suggestions : null;
  }
};