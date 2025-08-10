/**
 * /mcp-helper list - List configured MCP servers
 * 
 * This slash command handler lists all configured MCP servers
 * within the Claude Code chat interface.
 */

export default {
  name: 'list',
  description: 'List all configured MCP servers',
  usage: '/mcp-helper list',
  
  /**
   * Execute the list command
   * @param {Object} context - Command context with utilities
   * @returns {Promise<Object>} - Execution result
   */
  async execute(context) {
    const { configManager, serverCards } = context;
    
    try {
      // Load configuration
      const config = await configManager.loadConfig();
      const configuredServers = config.mcpServers || {};
      
      // Load all server cards for ratings
      const allCards = await serverCards.listServerCards();
      const cardMap = new Map(allCards.map(card => [card.name, card]));
      
      // Get catalog servers not yet configured
      const catalogServers = allCards.filter(card => !configuredServers[card.name]);
      
      if (Object.keys(configuredServers).length === 0 && catalogServers.length === 0) {
        return {
          message: '📭 No MCP servers found',
          hint: 'Use `/mcp-helper init` to initialize, then `/mcp-helper add <server>` to add servers'
        };
      }
      
      // Format configured servers
      const configuredList = Object.entries(configuredServers).map(([name, config]) => {
        const card = cardMap.get(name);
        return {
          name,
          status: '✅ Configured',
          transport: config.command ? 'stdio' : config.url ? 'http/sse' : 'unknown',
          runtime: card?.runtime || 'custom',
          ratings: card ? {
            human: `${card.agenticUsefulness?.humanVerificationRating || '?'}/5`,
            agent: `${card.agenticUsefulness?.aiAgentRating || '?'}/5`
          } : null,
          source: config.metadata?.source || 'manual'
        };
      });
      
      // Format available servers (top recommendations)
      const availableList = catalogServers
        .sort((a, b) => {
          const scoreA = (a.agenticUsefulness?.aiAgentRating || 0) + (a.agenticUsefulness?.humanVerificationRating || 0);
          const scoreB = (b.agenticUsefulness?.aiAgentRating || 0) + (b.agenticUsefulness?.humanVerificationRating || 0);
          return scoreB - scoreA;
        })
        .slice(0, 5)
        .map(card => ({
          name: card.name,
          status: '⭕ Available',
          transport: card.transports[0],
          runtime: card.runtime,
          ratings: {
            human: `${card.agenticUsefulness?.humanVerificationRating}/5`,
            agent: `${card.agenticUsefulness?.aiAgentRating}/5`
          },
          description: card.description
        }));
      
      // Create formatted table
      const formatTable = (servers, title) => {
        if (servers.length === 0) return null;
        
        const lines = [title, ''];
        
        // Header
        lines.push('| Server | Status | Transport | Runtime | Human | AI Agent |');
        lines.push('|--------|--------|-----------|---------|-------|----------|');
        
        // Rows
        servers.forEach(server => {
          const human = server.ratings?.human || '-';
          const agent = server.ratings?.agent || '-';
          lines.push(`| ${server.name} | ${server.status} | ${server.transport} | ${server.runtime} | ${human} | ${agent} |`);
        });
        
        return lines.join('\n');
      };
      
      const configuredTable = formatTable(configuredList, '### 📦 Configured Servers');
      const availableTable = formatTable(availableList, '### 🎯 Top Recommended Servers');
      
      // Build response
      const sections = [];
      if (configuredTable) sections.push(configuredTable);
      if (availableTable) sections.push(availableTable);
      
      return {
        message: '## MCP Servers Overview',
        content: sections.join('\n\n'),
        summary: {
          configured: configuredList.length,
          available: catalogServers.length,
          total: allCards.length
        },
        recommendations: this.getRecommendations(configuredList, catalogServers),
        actions: [
          'Use `/mcp-helper add <server>` to add a server',
          'Use `/mcp-helper reconfigure <server>` to modify configuration',
          'Use `/mcp-helper add-custom` to add a custom server'
        ]
      };
    } catch (error) {
      return {
        message: `❌ Failed to list servers: ${error.message}`,
        error: error.stack
      };
    }
  },
  
  /**
   * Get recommendations based on current configuration
   */
  getRecommendations(configured, available) {
    const recommendations = [];
    const configuredNames = new Set(configured.map(s => s.name));
    
    // Check for essential servers
    const essentials = ['serena', 'sequentialthinking', 'memory', 'github-official'];
    const missingEssentials = essentials.filter(e => !configuredNames.has(e));
    
    if (missingEssentials.length > 0) {
      recommendations.push({
        priority: 'high',
        message: `🔴 Missing essential servers: ${missingEssentials.join(', ')}`,
        action: `Add with: ${missingEssentials.map(s => `/mcp-helper add ${s}`).join(' or ')}`
      });
    }
    
    // Check for high-rated servers
    const highRated = available
      .filter(card => card.agenticUsefulness?.aiAgentRating >= 4)
      .slice(0, 2);
    
    if (highRated.length > 0) {
      recommendations.push({
        priority: 'medium',
        message: `🟡 Recommended high-value servers: ${highRated.map(c => c.name).join(', ')}`,
        action: 'These servers have high AI agent ratings'
      });
    }
    
    return recommendations.length > 0 ? recommendations : null;
  }
};