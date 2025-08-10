/**
 * CLAUDE.md Generator for MCP Helper
 * Creates and updates CLAUDE.md with current MCP configuration
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Handlebars from 'handlebars';
import { StatusManager } from './status-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ClaudeMdGenerator {
  constructor(configManager, serverCardsManager) {
    this.configManager = configManager;
    this.serverCardsManager = serverCardsManager;
    this.statusManager = new StatusManager();
    this.claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    this.templatePath = path.join(__dirname, '..', 'templates', 'claude.md.hbs');
  }

  /**
   * Generate or update CLAUDE.md
   */
  async generate() {
    try {
      // Gather current configuration
      const data = await this.gatherConfigData();
      
      // Generate content
      const content = this.generateContent(data);
      
      // Write to file
      await fs.writeFile(this.claudeMdPath, content);
      
      return true;
    } catch (error) {
      console.error('Error generating CLAUDE.md:', error);
      return false;
    }
  }

  /**
   * Gather configuration data
   */
  async gatherConfigData() {
    const servers = await this.configManager.listServers();
    const projectEnv = await this.configManager.readProjectEnv();
    const projectStatus = await this.statusManager.readStatus();
    
    // Enhance server data with card information
    const enhancedServers = servers.map(server => {
      const card = this.serverCardsManager.getCard(server.id);
      return {
        ...server,
        card,
        name: card?.name || server.id,
        description: card?.useCases?.project?.[0] || card?.useCases?.generic?.[0] || '',
        status: this.getServerStatus(server, card),
        envVars: this.getServerEnvVars(server, card, projectEnv)
      };
    });

    // Get essential servers based on ratings
    const essentialServers = this.serverCardsManager.getEssentialServers();
    
    return {
      generatedAt: new Date().toISOString(),
      projectPath: process.cwd(),
      projectStatus,  // Include the full project status
      servers: enhancedServers,
      globalServers: enhancedServers.filter(s => s.scope === 'global'),
      projectServers: enhancedServers.filter(s => s.scope === 'project'),
      requiredEnvVars: this.collectRequiredEnvVars(enhancedServers),
      categories: this.categorizeServers(enhancedServers),
      essentialServers,
      agenticRatings: this.getAgenticRatings(enhancedServers),
      mcpUsageProtocol: this.getMcpUsageProtocol()
    };
  }

  /**
   * Get server status
   */
  getServerStatus(server, card) {
    // Check if all required env vars are set
    if (card) {
      const projectEnv = this.configManager.readProjectEnv();
      const validation = this.serverCardsManager.validateEnvVars(card, projectEnv);
      if (!validation.valid) {
        return 'missing-env';
      }
    }
    
    return 'configured';
  }

  /**
   * Get server environment variables
   */
  getServerEnvVars(server, card, projectEnv) {
    if (!card || !card.envSchema) return [];
    
    return card.envSchema.map(env => ({
      name: env.name,
      description: env.description,
      required: env.required !== false,
      isSet: !!projectEnv[env.name],
      example: env.example
    }));
  }

  /**
   * Collect all required environment variables
   */
  collectRequiredEnvVars(servers) {
    const envVars = new Map();
    
    for (const server of servers) {
      if (server.envVars) {
        for (const envVar of server.envVars) {
          if (envVar.required && !envVar.isSet) {
            if (!envVars.has(envVar.name)) {
              envVars.set(envVar.name, {
                name: envVar.name,
                description: envVar.description,
                servers: [],
                example: envVar.example
              });
            }
            envVars.get(envVar.name).servers.push(server.name);
          }
        }
      }
    }
    
    return Array.from(envVars.values());
  }

  /**
   * Categorize servers by runtime/type
   */
  categorizeServers(servers) {
    const categories = new Map();
    
    for (const server of servers) {
      const category = server.card?.runtime || 'other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(server);
    }
    
    return Array.from(categories.entries()).map(([name, servers]) => ({
      name,
      servers
    }));
  }

  /**
   * Get agentic ratings summary
   */
  getAgenticRatings(servers) {
    const ratings = {
      highAgentValue: [],
      highHumanValue: [],
      balanced: []
    };
    
    for (const server of servers) {
      if (!server.card?.agenticUsefulness) continue;
      
      const usefulness = server.card.agenticUsefulness;
      
      if (usefulness.aiAgentRating >= 5) {
        ratings.highAgentValue.push({
          name: server.name,
          rating: usefulness.aiAgentRating,
          rationale: usefulness.ratingRationale.agent
        });
      }
      
      if (usefulness.humanVerificationRating >= 4) {
        ratings.highHumanValue.push({
          name: server.name,
          rating: usefulness.humanVerificationRating,
          rationale: usefulness.ratingRationale.human
        });
      }
      
      if (usefulness.humanVerificationRating >= 3 && usefulness.aiAgentRating >= 4) {
        ratings.balanced.push({
          name: server.name,
          humanRating: usefulness.humanVerificationRating,
          agentRating: usefulness.aiAgentRating
        });
      }
    }
    
    return ratings;
  }

  /**
   * Get MCP usage protocol
   */
  getMcpUsageProtocol() {
    return {
      primaryTools: [
        'serena for ALL code navigation (instead of Read/Grep)',
        'sequentialthinking for planning complex tasks',
        'memory for persistent context',
        'perplexity-ask for research (with system prompt)',
        'github-official for repository operations'
      ],
      fallbackStrategy: [
        'After 2 failed attempts, switch tool types',
        'Native → MCP alternative',
        'MCP → Native alternative'
      ],
      efficiency: [
        'Use native tools for simple operations',
        'Use MCP tools for specialized tasks',
        'Batch operations when possible'
      ]
    };
  }

  /**
   * Generate markdown content
   */
  generateContent(data) {
    // If template exists, use it
    if (fs.existsSync(this.templatePath)) {
      const template = fs.readFileSync(this.templatePath, 'utf-8');
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(data);
    }
    
    // Otherwise, generate default content
    return this.generateDefaultContent(data);
  }

  /**
   * Generate default CLAUDE.md content
   */
  generateDefaultContent(data) {
    let content = `# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this project.

> Generated by MCP Helper on ${new Date().toLocaleString()}

## MCP Server Configuration

This project has the following MCP servers configured:

### Active Servers

| Server | Scope | Status | Description |
|--------|-------|--------|-------------|
`;

    for (const server of data.servers) {
      const status = server.status === 'configured' ? '✅' : '⚠️';
      content += `| ${server.name} | ${server.scope} | ${status} | ${server.description} |\n`;
    }

    // Add environment variables section
    if (data.requiredEnvVars.length > 0) {
      content += `
## Required Environment Variables

The following environment variables need to be set:

`;
      for (const envVar of data.requiredEnvVars) {
        content += `- **${envVar.name}**: ${envVar.description} (used by: ${envVar.servers.join(', ')})\n`;
        if (envVar.example) {
          content += `  Example: \`${envVar.example}\`\n`;
        }
      }
    }

    // Add usage examples
    content += `
## Usage Examples

### Initialize the project
\`\`\`bash
/mcp-helper init
\`\`\`

### Add a new server
\`\`\`bash
/mcp-helper add <server-name>
\`\`\`

### List configured servers
\`\`\`bash
/mcp-helper list
\`\`\`

### Reconfigure a server
\`\`\`bash
/mcp-helper reconfigure <server-name>
\`\`\`

## Server Categories

`;

    for (const category of data.categories) {
      content += `### ${category.name.charAt(0).toUpperCase() + category.name.slice(1)} Servers\n\n`;
      for (const server of category.servers) {
        content += `- **${server.name}**: ${server.description}\n`;
      }
      content += '\n';
    }

    // Add troubleshooting section
    content += `## Troubleshooting

### Missing Environment Variables
If you see ⚠️ status for any server, check that the required environment variables are set in your \`.env\` file.

### Docker Issues
For Docker-based servers, ensure Docker is installed and running:
\`\`\`bash
docker --version
docker ps
\`\`\`

### NPX Issues
For NPX-based servers, ensure Node.js and NPM are installed:
\`\`\`bash
node --version
npm --version
\`\`\`

## Notes

- Global servers are configured in \`~/.claude.json\`
- Project-specific overrides are in \`.env\`
- Backups are stored in \`~/.mcp-helper/backups/\`
- Server cards are defined in \`new_start/mcp-helper/catalog/server_cards/\`

## Further Information

For more details on MCP servers and their configuration, see:
- [MCP Documentation](https://modelcontextprotocol.io)
- [Project README](./README.md)
`;

    return content;
  }

  /**
   * Update specific section in CLAUDE.md
   */
  async updateSection(sectionName, content) {
    try {
      let claudeMd = '';
      
      if (await fs.pathExists(this.claudeMdPath)) {
        claudeMd = await fs.readFile(this.claudeMdPath, 'utf-8');
      }
      
      // Simple section replacement
      const sectionStart = `## ${sectionName}`;
      const sectionEnd = '\n##';
      
      const startIndex = claudeMd.indexOf(sectionStart);
      if (startIndex !== -1) {
        const endIndex = claudeMd.indexOf(sectionEnd, startIndex + sectionStart.length);
        
        if (endIndex !== -1) {
          claudeMd = claudeMd.substring(0, startIndex) +
                     `${sectionStart}\n\n${content}\n` +
                     claudeMd.substring(endIndex);
        } else {
          // Last section
          claudeMd = claudeMd.substring(0, startIndex) +
                     `${sectionStart}\n\n${content}\n`;
        }
      } else {
        // Add new section
        claudeMd += `\n${sectionStart}\n\n${content}\n`;
      }
      
      await fs.writeFile(this.claudeMdPath, claudeMd);
      return true;
    } catch (error) {
      console.error('Error updating CLAUDE.md section:', error);
      return false;
    }
  }

  /**
   * Check if CLAUDE.md exists
   */
  async exists() {
    return await fs.pathExists(this.claudeMdPath);
  }

  /**
   * Get last modified time
   */
  async getLastModified() {
    try {
      const stat = await fs.stat(this.claudeMdPath);
      return stat.mtime;
    } catch (error) {
      return null;
    }
  }
}

export default ClaudeMdGenerator;