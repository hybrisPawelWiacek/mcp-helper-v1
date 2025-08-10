/**
 * Server Cards Manager for MCP Helper
 * Loads and manages server card configurations
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ServerCardsManager {
  constructor() {
    this.cardsDir = path.join(__dirname, '..', 'catalog', 'server_cards');
    this.schemaPath = path.join(__dirname, '..', 'schemas', 'server_card.schema.json');
    this.cards = new Map();
    this.ajv = new Ajv();
    this.validator = null;
  }

  /**
   * Initialize and load all server cards
   */
  async initialize() {
    try {
      // Load schema
      const schema = await fs.readJson(this.schemaPath);
      this.validator = this.ajv.compile(schema);

      // Load all server cards from catalog
      await this.loadAllCards();
      
      // Load custom server cards from user directory
      await this.loadCustomCards();
      
      return true;
    } catch (error) {
      console.error('Error initializing server cards:', error);
      return false;
    }
  }

  /**
   * Load all server cards from the catalog
   */
  async loadAllCards() {
    try {
      const files = await fs.readdir(this.cardsDir);
      
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.yaml')) {
          await this.loadCard(file);
        }
      }

      // Also check for subdirectories (like postgres/)
      for (const file of files) {
        const filePath = path.join(this.cardsDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          const subFiles = await fs.readdir(filePath);
          for (const subFile of subFiles) {
            if (subFile === 'server_card.yaml' || subFile === 'server_card.json') {
              await this.loadCard(path.join(file, subFile));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading server cards:', error);
    }
  }

  /**
   * Load custom server cards from user directory
   */
  async loadCustomCards() {
    try {
      const customCardsDir = path.join(os.homedir(), '.mcp-helper', 'custom-servers');
      
      // Check if directory exists
      if (!await fs.pathExists(customCardsDir)) {
        return; // No custom cards yet
      }
      
      const files = await fs.readdir(customCardsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(customCardsDir, file);
          try {
            const cardData = await fs.readJson(filePath);
            
            // Mark as custom
            cardData.custom = true;
            
            // Add to cards collection
            this.cards.set(cardData.id, cardData);
          } catch (error) {
            console.error(`Error loading custom card ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading custom cards:', error);
    }
  }

  /**
   * Load a single server card
   */
  async loadCard(filename) {
    try {
      const filePath = path.join(this.cardsDir, filename);
      let cardData;

      if (filename.endsWith('.yaml')) {
        // For YAML files, we'd need js-yaml
        const yaml = await import('js-yaml');
        const content = await fs.readFile(filePath, 'utf-8');
        cardData = yaml.load(content);
      } else {
        cardData = await fs.readJson(filePath);
      }

      // Validate card
      if (this.validator && !this.validator(cardData)) {
        console.error(`Invalid server card ${filename}:`, this.validator.errors);
        return false;
      }

      this.cards.set(cardData.id, cardData);
      return true;
    } catch (error) {
      console.error(`Error loading card ${filename}:`, error);
      return false;
    }
  }

  /**
   * Get a server card by ID
   */
  getCard(serverId) {
    return this.cards.get(serverId);
  }

  /**
   * Get all server cards
   */
  getAllCards() {
    return Array.from(this.cards.values());
  }

  /**
   * Get active server cards
   */
  getActiveCards() {
    return this.getAllCards().filter(card => card.status === 'active');
  }

  /**
   * Search server cards by keyword
   */
  searchCards(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    return this.getAllCards().filter(card => {
      return card.name.toLowerCase().includes(lowerKeyword) ||
             card.id.toLowerCase().includes(lowerKeyword) ||
             (card.useCases?.generic?.some(use => use.toLowerCase().includes(lowerKeyword))) ||
             (card.useCases?.project?.some(use => use.toLowerCase().includes(lowerKeyword)));
    });
  }

  /**
   * Generate MCP server configuration from card
   */
  generateServerConfig(card, envVars = {}) {
    const config = {};

    // Determine command based on deployment type
    switch (card.deploy.kind) {
      case 'docker':
        config.command = card.deploy.command || 'docker';
        config.args = card.deploy.args || [];
        
        // Replace environment variables in args
        config.args = config.args.map(arg => {
          // Replace ${VAR} with actual values or keep as placeholder
          return arg.replace(/\$\{([^}]+)\}/g, (match, varName) => {
            return envVars[varName] ? envVars[varName] : match;
          });
        });
        break;

      case 'npx':
        config.command = card.deploy.command || 'npx';
        config.args = card.deploy.args || [];
        break;

      case 'native':
        if (card.deploy.command === 'uvx') {
          config.command = 'uvx';
          config.args = card.deploy.args || [];
        } else if (card.deploy.command.startsWith('http')) {
          // HTTP/SSE transport
          config.command = card.deploy.command;
          config.args = [];
          config.transport = 'http';
        } else {
          config.command = card.deploy.command;
          config.args = card.deploy.args || [];
        }
        break;
        
      default:
        // Handle custom servers or servers without a standard deploy.kind
        if (card.deploy && card.deploy.command) {
          config.command = card.deploy.command;
          config.args = card.deploy.args || [];
        } else if (card.command) {
          // Fallback to direct command field for custom servers
          config.command = card.command;
          config.args = card.args || [];
        } else {
          // If no deployment info, assume stdio transport with placeholder
          config.command = 'echo';
          config.args = ['Custom server - manual configuration required'];
        }
        break;
    }

    // Add environment variables if needed
    if (card.envSchema && card.envSchema.length > 0) {
      config.env = {};
      for (const envVar of card.envSchema) {
        // Use provided value or placeholder
        config.env[envVar.name] = envVars[envVar.name] || `\${${envVar.name}}`;
      }
    }

    return config;
  }

  /**
   * Get required environment variables for a server
   */
  getRequiredEnvVars(card) {
    if (!card.envSchema) return [];
    
    return card.envSchema
      .filter(env => env.required !== false)
      .map(env => ({
        name: env.name,
        description: env.description,
        example: env.example
      }));
  }

  /**
   * Get optional environment variables for a server
   */
  getOptionalEnvVars(card) {
    if (!card.envSchema) return [];
    
    return card.envSchema
      .filter(env => env.required === false)
      .map(env => ({
        name: env.name,
        description: env.description,
        example: env.example
      }));
  }

  /**
   * Validate environment variables for a server
   */
  validateEnvVars(card, providedVars) {
    const required = this.getRequiredEnvVars(card);
    const missing = [];

    for (const reqVar of required) {
      if (!providedVars[reqVar.name]) {
        missing.push(reqVar);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Update or create a server card
   */
  async saveCard(cardData) {
    try {
      // Validate card
      if (this.validator && !this.validator(cardData)) {
        console.error('Invalid server card:', this.validator.errors);
        return false;
      }

      const cardPath = path.join(this.cardsDir, `${cardData.id}.json`);
      await fs.writeJson(cardPath, cardData, { spaces: 2 });
      
      // Update in-memory cache
      this.cards.set(cardData.id, cardData);
      
      return true;
    } catch (error) {
      console.error('Error saving server card:', error);
      return false;
    }
  }

  /**
   * Get server categories
   */
  getCategories() {
    const categories = new Set();
    
    for (const card of this.cards.values()) {
      if (card.runtime) {
        categories.add(card.runtime);
      }
    }
    
    return Array.from(categories);
  }

  /**
   * Get servers by category/runtime
   */
  getServersByCategory(category) {
    return this.getAllCards().filter(card => card.runtime === category);
  }

  /**
   * Check if server supports specific transport
   */
  supportsTransport(card, transport) {
    return card.transports && card.transports.includes(transport);
  }

  /**
   * Get deployment instructions for a server
   */
  getDeploymentInstructions(card) {
    const instructions = [];

    // Check prerequisites
    switch (card.deploy.kind) {
      case 'docker':
        instructions.push('Requires: Docker installed and running');
        break;
      case 'npx':
        instructions.push('Requires: Node.js and NPM installed');
        break;
      case 'native':
        if (card.deploy.command === 'uvx') {
          instructions.push('Requires: Python and uv package manager');
        }
        break;
    }

    // Add environment variables
    const requiredVars = this.getRequiredEnvVars(card);
    if (requiredVars.length > 0) {
      instructions.push('Required environment variables:');
      for (const envVar of requiredVars) {
        instructions.push(`  - ${envVar.name}: ${envVar.description}`);
      }
    }

    // Add ports if needed
    if (card.ports && card.ports.length > 0) {
      instructions.push(`Ports: ${card.ports.join(', ')}`);
    }

    return instructions;
  }

  /**
   * Get servers by agentic usefulness rating
   */
  getServersByRating(perspective, minRating = 4) {
    return this.getAllCards().filter(card => {
      if (!card.agenticUsefulness) return false;
      
      const rating = perspective === 'human' 
        ? card.agenticUsefulness.humanVerificationRating
        : card.agenticUsefulness.aiAgentRating;
      
      return rating >= minRating;
    });
  }

  /**
   * Get essential servers for agentic development
   */
  getEssentialServers() {
    return {
      forAgents: this.getServersByRating('agent', 5),
      forHumans: this.getServersByRating('human', 4),
      balanced: this.getAllCards().filter(card => {
        if (!card.agenticUsefulness) return false;
        return card.agenticUsefulness.humanVerificationRating >= 3 &&
               card.agenticUsefulness.aiAgentRating >= 4;
      })
    };
  }

  /**
   * Recommend servers based on use case
   */
  recommendServers(useCase, prioritizeRatings = true) {
    const matches = this.searchCards(useCase);
    
    if (!prioritizeRatings) {
      return matches;
    }

    // Sort by combined agentic usefulness ratings
    return matches.sort((a, b) => {
      const aScore = this.getAgenticScore(a);
      const bScore = this.getAgenticScore(b);
      return bScore - aScore;
    });
  }

  /**
   * Calculate combined agentic usefulness score
   */
  getAgenticScore(card) {
    if (!card.agenticUsefulness) return 0;
    
    // Weight agent rating slightly higher for agentic development
    return (card.agenticUsefulness.aiAgentRating * 1.2) + 
           (card.agenticUsefulness.humanVerificationRating * 0.8);
  }

  /**
   * Get best practices for a server
   */
  getBestPractices(card) {
    const practices = [];
    
    // Add agentic usefulness best practices
    if (card.agenticUsefulness?.bestPractices) {
      practices.push(...card.agenticUsefulness.bestPractices);
    }
    
    // Add tool selection protocol practices
    if (card.toolSelectionProtocol?.primaryUse) {
      practices.push(...card.toolSelectionProtocol.primaryUse.map(
        use => `Use for: ${use}`
      ));
    }
    
    return practices;
  }
}

export default ServerCardsManager;