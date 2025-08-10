/**
 * Advisory Engine - Provides intelligent server recommendations and usage advice
 * Analyzes project context and user behavior to suggest optimal MCP server configurations
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ProjectAnalyzer } from './project-analyzer.js';
import { ServerCardsManager } from './server-cards.js';
import { ConfigManager } from './config-manager.js';
import { ResponseFormatter } from './response-formatter.js';

export class AdvisoryEngine {
  constructor() {
    this.projectAnalyzer = new ProjectAnalyzer();
    this.serverCards = new ServerCardsManager();
    this.configManager = new ConfigManager();
    this.responseFormatter = new ResponseFormatter();
    
    // Advisory rules and patterns
    this.advisoryRules = this.initializeAdvisoryRules();
    this.usagePatterns = this.initializeUsagePatterns();
  }

  /**
   * Initialize advisory rules for different scenarios
   */
  initializeAdvisoryRules() {
    return {
      // Development stage rules
      greenfield: {
        essential: ['serena', 'sequentialthinking', 'github-official'],
        recommended: ['memory', 'context7'],
        rationale: 'New projects benefit from semantic code understanding and planning tools'
      },
      
      legacy: {
        essential: ['serena', 'memory'],
        recommended: ['sequentialthinking', 'github-official', 'atlassian'],
        rationale: 'Legacy code requires careful analysis and documentation tracking'
      },
      
      // Technology-specific rules
      webDevelopment: {
        essential: ['firecrawl', 'context7'],
        recommended: ['playwright', 'puppeteer'],
        rationale: 'Web projects need browser automation and documentation access'
      },
      
      apiDevelopment: {
        essential: ['postgres', 'github-official'],
        recommended: ['brave-search', 'perplexity-ask'],
        rationale: 'API development benefits from database and research tools'
      },
      
      dataScience: {
        essential: ['postgres', 'memory'],
        recommended: ['perplexity-ask', 'context7'],
        rationale: 'Data projects need persistent storage and research capabilities'
      },
      
      // Workflow-specific rules
      collaboration: {
        essential: ['slack', 'github-official'],
        recommended: ['atlassian', 'notion'],
        rationale: 'Team projects require communication and project management tools'
      },
      
      documentation: {
        essential: ['notion', 'confluence'],
        recommended: ['firecrawl', 'context7'],
        rationale: 'Documentation-heavy work benefits from wiki and scraping tools'
      },
      
      research: {
        essential: ['perplexity-ask', 'brave-search'],
        recommended: ['context7', 'firecrawl'],
        rationale: 'Research tasks need comprehensive search and information extraction'
      }
    };
  }

  /**
   * Initialize usage pattern detection
   */
  initializeUsagePatterns() {
    return {
      // Common task patterns
      codeRefactoring: {
        servers: ['serena', 'sequentialthinking', 'github-official'],
        indicators: ['refactor', 'clean', 'optimize', 'restructure']
      },
      
      bugFixing: {
        servers: ['serena', 'github-official', 'perplexity-ask'],
        indicators: ['bug', 'fix', 'error', 'issue', 'debug']
      },
      
      featureDevelopment: {
        servers: ['sequentialthinking', 'serena', 'context7'],
        indicators: ['feature', 'implement', 'add', 'create', 'build']
      },
      
      testing: {
        servers: ['playwright', 'puppeteer', 'github-official'],
        indicators: ['test', 'spec', 'e2e', 'unit', 'integration']
      },
      
      deployment: {
        servers: ['github-official', 'slack'],
        indicators: ['deploy', 'release', 'production', 'ship']
      }
    };
  }

  /**
   * Get comprehensive advice for current context
   */
  async getAdvice(options = {}) {
    const advice = {
      recommendations: [],
      warnings: [],
      tips: [],
      optimizations: []
    };
    
    // Analyze current state
    const currentConfig = await this.configManager.readGlobalConfig();
    const projectAnalysis = await this.projectAnalyzer.analyze(
      options.projectPath || process.cwd()
    );
    
    // Get server recommendations
    advice.recommendations = await this.getServerRecommendations(
      projectAnalysis,
      currentConfig,
      options
    );
    
    // Check for configuration issues
    advice.warnings = await this.checkConfigurationIssues(currentConfig);
    
    // Get optimization suggestions
    advice.optimizations = await this.getOptimizationSuggestions(
      currentConfig,
      projectAnalysis
    );
    
    // Add contextual tips
    advice.tips = await this.getContextualTips(projectAnalysis);
    
    return advice;
  }

  /**
   * Get server recommendations based on analysis
   */
  async getServerRecommendations(projectAnalysis, currentConfig, options = {}) {
    await this.serverCards.initialize();
    const allCards = this.serverCards.getAllCards(); // Already returns an array
    const configuredServers = Object.keys(currentConfig.mcpServers || {});
    
    const recommendations = [];
    
    // Check project type recommendations
    const projectType = this.detectProjectType(projectAnalysis);
    if (projectType && this.advisoryRules[projectType]) {
      const rule = this.advisoryRules[projectType];
      
      // Essential servers not configured
      rule.essential.forEach(serverName => {
        if (!configuredServers.includes(serverName)) {
          const card = allCards.find(c => c.name === serverName);
          if (card) {
            recommendations.push({
              name: serverName,
              priority: 'essential',
              reason: `Essential for ${projectType}: ${rule.rationale}`,
              card
            });
          }
        }
      });
      
      // Recommended servers not configured
      rule.recommended.forEach(serverName => {
        if (!configuredServers.includes(serverName)) {
          const card = allCards.find(c => c.name === serverName);
          if (card) {
            recommendations.push({
              name: serverName,
              priority: 'recommended',
              reason: `Recommended for ${projectType}`,
              card
            });
          }
        }
      });
    }
    
    // Technology-specific recommendations
    const techRecommendations = this.getTechnologyRecommendations(
      projectAnalysis,
      configuredServers,
      allCards
    );
    recommendations.push(...techRecommendations);
    
    // Usage pattern recommendations
    if (options.recentTasks) {
      const patternRecommendations = this.getPatternRecommendations(
        options.recentTasks,
        configuredServers,
        allCards
      );
      recommendations.push(...patternRecommendations);
    }
    
    // Remove duplicates and sort by priority
    const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
    return this.sortRecommendations(uniqueRecommendations);
  }

  /**
   * Detect project type from analysis
   */
  detectProjectType(analysis) {
    if (!analysis) return null;
    
    // Check for greenfield vs legacy
    const hasGitHistory = analysis.tools?.includes('git');
    const fileCount = analysis.fileCount || 0;
    
    if (!hasGitHistory || fileCount < 10) {
      return 'greenfield';
    }
    
    if (fileCount > 1000 || analysis.hasLegacyPatterns) {
      return 'legacy';
    }
    
    // Check for specific project types
    if (analysis.frameworks?.some(f => 
      ['react', 'vue', 'angular', 'next', 'gatsby'].includes(f.toLowerCase())
    )) {
      return 'webDevelopment';
    }
    
    if (analysis.frameworks?.some(f => 
      ['express', 'fastapi', 'django', 'rails'].includes(f.toLowerCase())
    )) {
      return 'apiDevelopment';
    }
    
    if (analysis.languages?.some(l => 
      ['python', 'r', 'julia'].includes(l.toLowerCase())
    ) && analysis.hasDataFiles) {
      return 'dataScience';
    }
    
    return null;
  }

  /**
   * Get technology-specific recommendations
   */
  getTechnologyRecommendations(analysis, configuredServers, allCards) {
    const recommendations = [];
    
    // Database recommendations
    if (analysis.hasDatabaseConfig && !configuredServers.includes('postgres')) {
      const card = allCards.find(c => c.name === 'postgres');
      if (card) {
        recommendations.push({
          name: 'postgres',
          priority: 'recommended',
          reason: 'Database configuration detected in project',
          card
        });
      }
    }
    
    // Testing framework recommendations
    if (analysis.hasTests) {
      if (analysis.hasE2ETests && !configuredServers.includes('playwright')) {
        const card = allCards.find(c => c.name === 'playwright');
        if (card) {
          recommendations.push({
            name: 'playwright',
            priority: 'recommended',
            reason: 'E2E tests detected - Playwright can help with browser automation',
            card
          });
        }
      }
    }
    
    // Documentation recommendations
    if (analysis.hasDocumentation) {
      if (!configuredServers.includes('notion') && !configuredServers.includes('confluence')) {
        const card = allCards.find(c => c.name === 'notion');
        if (card) {
          recommendations.push({
            name: 'notion',
            priority: 'optional',
            reason: 'Documentation found - Notion can help manage docs',
            card
          });
        }
      }
    }
    
    return recommendations;
  }

  /**
   * Get pattern-based recommendations
   */
  getPatternRecommendations(recentTasks, configuredServers, allCards) {
    const recommendations = [];
    const taskKeywords = recentTasks.join(' ').toLowerCase();
    
    Object.entries(this.usagePatterns).forEach(([pattern, config]) => {
      const hasIndicators = config.indicators.some(indicator => 
        taskKeywords.includes(indicator)
      );
      
      if (hasIndicators) {
        config.servers.forEach(serverName => {
          if (!configuredServers.includes(serverName)) {
            const card = allCards.find(c => c.name === serverName);
            if (card) {
              recommendations.push({
                name: serverName,
                priority: 'recommended',
                reason: `Useful for ${pattern.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
                card
              });
            }
          }
        });
      }
    });
    
    return recommendations;
  }

  /**
   * Check for configuration issues
   */
  async checkConfigurationIssues(config) {
    const warnings = [];
    
    // Check for missing environment variables
    const envVars = process.env;
    const servers = config.mcpServers || {};
    
    for (const [serverName, serverConfig] of Object.entries(servers)) {
      // Check if server command references env vars
      const envVarPattern = /\$\{?([A-Z_]+)\}?/g;
      const matches = [...(serverConfig.command?.matchAll(envVarPattern) || [])];
      
      for (const match of matches) {
        const varName = match[1];
        if (!envVars[varName]) {
          warnings.push({
            type: 'missing_env',
            server: serverName,
            variable: varName,
            message: `Missing environment variable: ${varName} for ${serverName}`
          });
        }
      }
    }
    
    // Check for conflicting servers
    const conflictPairs = [
      ['playwright', 'puppeteer'],  // Both are browser automation
      ['notion', 'confluence']       // Both are documentation
    ];
    
    conflictPairs.forEach(([server1, server2]) => {
      if (servers[server1] && servers[server2]) {
        warnings.push({
          type: 'potential_conflict',
          servers: [server1, server2],
          message: `Both ${server1} and ${server2} configured - consider using only one`
        });
      }
    });
    
    // Check for deprecated configurations
    Object.entries(servers).forEach(([name, config]) => {
      if (config.deprecated) {
        warnings.push({
          type: 'deprecated',
          server: name,
          message: `Server ${name} is using deprecated configuration`
        });
      }
    });
    
    return warnings;
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions(config, analysis) {
    const optimizations = [];
    
    // Check for underutilized servers
    const servers = Object.keys(config.mcpServers || {});
    
    // Suggest removing unused servers
    if (servers.length > 10) {
      optimizations.push({
        type: 'reduce_servers',
        priority: 'low',
        message: 'Consider removing unused servers to improve startup time',
        suggestion: 'Run /mcp-helper analyze-usage to see which servers are rarely used'
      });
    }
    
    // Suggest server combinations
    if (servers.includes('github-official') && !servers.includes('serena')) {
      optimizations.push({
        type: 'add_complementary',
        priority: 'medium',
        message: 'Add serena for better code navigation alongside GitHub',
        suggestion: 'These servers work well together for development workflows'
      });
    }
    
    // Performance optimizations
    if (servers.includes('memory') && !servers.includes('sequentialthinking')) {
      optimizations.push({
        type: 'enhance_planning',
        priority: 'medium',
        message: 'Add sequentialthinking to complement memory for better task planning',
        suggestion: 'Sequential thinking helps break down complex tasks stored in memory'
      });
    }
    
    return optimizations;
  }

  /**
   * Get contextual tips
   */
  async getContextualTips(analysis) {
    const tips = [];
    
    // Framework-specific tips
    if (analysis.frameworks?.includes('next')) {
      tips.push({
        category: 'framework',
        tip: 'Use context7 to get latest Next.js documentation and best practices'
      });
    }
    
    if (analysis.languages?.includes('python')) {
      tips.push({
        category: 'language',
        tip: 'Serena works exceptionally well with Python codebases for semantic search'
      });
    }
    
    // Workflow tips
    if (analysis.hasTests) {
      tips.push({
        category: 'testing',
        tip: 'Use sequentialthinking to plan comprehensive test strategies'
      });
    }
    
    // General best practices
    tips.push({
      category: 'general',
      tip: 'Start complex tasks with sequentialthinking for better planning'
    });
    
    tips.push({
      category: 'general',
      tip: 'Use memory to persist important project decisions and context'
    });
    
    return tips;
  }

  /**
   * Deduplicate recommendations
   */
  deduplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter(rec => {
      if (seen.has(rec.name)) {
        return false;
      }
      seen.add(rec.name);
      return true;
    });
  }

  /**
   * Sort recommendations by priority
   */
  sortRecommendations(recommendations) {
    const priorityOrder = {
      essential: 0,
      recommended: 1,
      optional: 2
    };
    
    return recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by AI agent rating
      const ratingA = a.card?.aiAgentRating || 0;
      const ratingB = b.card?.aiAgentRating || 0;
      return ratingB - ratingA;
    });
  }

  /**
   * Generate advisory report
   */
  async generateReport(options = {}) {
    const advice = await this.getAdvice(options);
    
    let report = '# MCP Server Advisory Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Recommendations section
    if (advice.recommendations.length > 0) {
      report += '## Recommended Servers\n\n';
      
      const essential = advice.recommendations.filter(r => r.priority === 'essential');
      const recommended = advice.recommendations.filter(r => r.priority === 'recommended');
      const optional = advice.recommendations.filter(r => r.priority === 'optional');
      
      if (essential.length > 0) {
        report += '### Essential\n';
        essential.forEach(rec => {
          report += `- **${rec.name}**: ${rec.reason}\n`;
        });
        report += '\n';
      }
      
      if (recommended.length > 0) {
        report += '### Recommended\n';
        recommended.forEach(rec => {
          report += `- **${rec.name}**: ${rec.reason}\n`;
        });
        report += '\n';
      }
      
      if (optional.length > 0) {
        report += '### Optional\n';
        optional.forEach(rec => {
          report += `- ${rec.name}: ${rec.reason}\n`;
        });
        report += '\n';
      }
    }
    
    // Warnings section
    if (advice.warnings.length > 0) {
      report += '## ⚠️ Warnings\n\n';
      advice.warnings.forEach(warning => {
        report += `- ${warning.message}\n`;
      });
      report += '\n';
    }
    
    // Optimizations section
    if (advice.optimizations.length > 0) {
      report += '## 💡 Optimization Suggestions\n\n';
      advice.optimizations.forEach(opt => {
        report += `### ${opt.message}\n`;
        report += `${opt.suggestion}\n\n`;
      });
    }
    
    // Tips section
    if (advice.tips.length > 0) {
      report += '## 📝 Tips\n\n';
      advice.tips.forEach(tip => {
        report += `- **${tip.category}**: ${tip.tip}\n`;
      });
    }
    
    return report;
  }

  /**
   * Interactive advisory session
   */
  async runInteractiveAdvisory() {
    console.log('Starting interactive advisory session...\n');
    
    // Get current advice
    const advice = await this.getAdvice();
    
    // Format and display advice
    const formatted = await this.responseFormatter.format(
      await this.generateReport(),
      { type: 'info' }
    );
    
    console.log(formatted);
    
    // Return advice for further processing
    return advice;
  }
}

// Export singleton instance
export const advisoryEngine = new AdvisoryEngine();