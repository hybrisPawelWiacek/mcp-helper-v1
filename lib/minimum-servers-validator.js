/**
 * Minimum Servers Validator for MCP Helper
 * Validates that foundation servers are configured before allowing custom server additions
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class MinimumServersValidator {
  constructor(configManager, serverCardsManager) {
    this.configManager = configManager;
    this.serverCardsManager = serverCardsManager;
    this.minimumServersPath = path.join(__dirname, '..', 'catalog', 'minimum_servers.json');
  }

  /**
   * Load minimum servers configuration
   */
  async loadMinimumServers() {
    try {
      return await fs.readJson(this.minimumServersPath);
    } catch (error) {
      console.error('Error loading minimum servers config:', error);
      return null;
    }
  }

  /**
   * Validate that minimum required servers are configured
   */
  async validate() {
    const minimum = await this.loadMinimumServers();
    if (!minimum) {
      return {
        isValid: false,
        error: 'Could not load minimum servers configuration',
        missing: [],
        warnings: []
      };
    }

    const configured = await this.configManager.listServers();
    const configuredIds = configured.map(s => s.id);

    // Check required servers
    const missingRequired = [];
    for (const required of minimum.required) {
      const isConfigured = configuredIds.includes(required.id);
      
      // Check alternatives if main server not configured
      let hasAlternative = false;
      if (!isConfigured && required.alternatives) {
        hasAlternative = required.alternatives.some(alt => configuredIds.includes(alt));
      }
      
      if (!isConfigured && !hasAlternative) {
        missingRequired.push(required);
      }
    }

    // Check recommended servers
    const missingRecommended = [];
    for (const recommended of minimum.recommended) {
      const isConfigured = configuredIds.includes(recommended.id);
      
      // Check alternatives if main server not configured
      let hasAlternative = false;
      if (!isConfigured && recommended.alternatives) {
        hasAlternative = recommended.alternatives.some(alt => configuredIds.includes(alt));
      }
      
      if (!isConfigured && !hasAlternative) {
        missingRecommended.push(recommended);
      }
    }

    // Determine validity
    const isValid = missingRequired.length === 0;
    
    // Generate warnings
    const warnings = [];
    if (missingRecommended.length > 0) {
      warnings.push({
        type: 'recommended',
        message: `Consider adding recommended servers for better custom server support`,
        servers: missingRecommended
      });
    }

    // Check warning threshold
    const totalConfigured = minimum.required.length - missingRequired.length + 
                           minimum.recommended.length - missingRecommended.length;
    
    if (totalConfigured < minimum.validation.warningThreshold) {
      warnings.push({
        type: 'threshold',
        message: minimum.validation.warningMessage,
        configured: totalConfigured,
        threshold: minimum.validation.warningThreshold
      });
    }

    return {
      isValid,
      missing: missingRequired,
      warnings,
      configured: configuredIds,
      summary: {
        requiredConfigured: minimum.required.length - missingRequired.length,
        requiredTotal: minimum.required.length,
        recommendedConfigured: minimum.recommended.length - missingRecommended.length,
        recommendedTotal: minimum.recommended.length
      }
    };
  }

  /**
   * Get foundation servers (required servers)
   */
  async getFoundationServers() {
    const minimum = await this.loadMinimumServers();
    if (!minimum) return [];
    return minimum.required;
  }

  /**
   * Get recommended servers
   */
  async getRecommendedServers() {
    const minimum = await this.loadMinimumServers();
    if (!minimum) return [];
    return minimum.recommended;
  }

  /**
   * Check if a specific server is a foundation server
   */
  async isFoundationServer(serverId) {
    const minimum = await this.loadMinimumServers();
    if (!minimum) return false;
    
    return minimum.required.some(s => s.id === serverId || 
                                     (s.alternatives && s.alternatives.includes(serverId)));
  }

  /**
   * Get detailed validation report for display
   */
  async getValidationReport() {
    const validation = await this.validate();
    const minimum = await this.loadMinimumServers();
    
    const report = {
      status: validation.isValid ? 'ready' : 'not-ready',
      message: validation.isValid ? 
        'All foundation servers configured. Ready for custom server support!' :
        `Missing ${validation.missing.length} foundation server(s)`,
      details: {
        foundation: {
          required: minimum.required.map(s => ({
            ...s,
            configured: validation.configured.includes(s.id) ||
                       (s.alternatives && s.alternatives.some(alt => validation.configured.includes(alt)))
          })),
          missing: validation.missing
        },
        recommended: {
          servers: minimum.recommended.map(s => ({
            ...s,
            configured: validation.configured.includes(s.id) ||
                       (s.alternatives && s.alternatives.some(alt => validation.configured.includes(alt)))
          })),
          missing: validation.warnings
            .filter(w => w.type === 'recommended')
            .flatMap(w => w.servers)
        }
      },
      nextSteps: validation.isValid ? [] : validation.missing.map(s => 
        `/mcp-helper add ${s.id}`
      )
    };
    
    return report;
  }

  /**
   * Check health of foundation servers
   */
  async checkFoundationServersHealth() {
    const validation = await this.validate();
    if (!validation.isValid) {
      return {
        healthy: false,
        reason: 'missing-servers',
        details: validation.missing
      };
    }

    const configured = await this.configManager.listServers();
    const foundation = await this.getFoundationServers();
    const foundationIds = foundation.map(f => f.id);
    
    // Check each foundation server's configuration
    const healthChecks = [];
    for (const server of configured) {
      if (!foundationIds.includes(server.id)) continue;
      
      // Check if server has required environment variables
      const serverCard = this.serverCardsManager.getCard(server.id);
      if (serverCard) {
        const projectEnv = await this.configManager.readProjectEnv();
        const envValidation = this.serverCardsManager.validateEnvVars(serverCard, projectEnv);
        
        healthChecks.push({
          serverId: server.id,
          healthy: envValidation.valid,
          missing: envValidation.missing || [],
          message: envValidation.valid ? 'Configured' : 'Missing environment variables'
        });
      }
    }
    
    const allHealthy = healthChecks.every(check => check.healthy);
    
    return {
      healthy: allHealthy,
      checks: healthChecks,
      summary: allHealthy ? 
        'All foundation servers are properly configured' :
        'Some foundation servers need configuration'
    };
  }

  /**
   * Get setup instructions for missing servers
   */
  async getSetupInstructions() {
    const validation = await this.validate();
    
    if (validation.isValid) {
      return {
        needed: false,
        message: 'All foundation servers are configured!'
      };
    }
    
    const instructions = {
      needed: true,
      message: 'Please configure the following foundation servers:',
      steps: []
    };
    
    for (const missing of validation.missing) {
      instructions.steps.push({
        command: `/mcp-helper add ${missing.id}`,
        server: missing.name,
        rationale: missing.rationale
      });
    }
    
    // Add recommended servers
    if (validation.warnings.length > 0) {
      const recommended = validation.warnings
        .filter(w => w.type === 'recommended')
        .flatMap(w => w.servers);
      
      if (recommended.length > 0) {
        instructions.recommended = recommended.map(server => ({
          command: `/mcp-helper add ${server.id}`,
          server: server.name,
          rationale: server.rationale
        }));
      }
    }
    
    return instructions;
  }
}

export default MinimumServersValidator;