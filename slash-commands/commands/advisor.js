/**
 * /mcp-helper advisor - Get intelligent MCP server recommendations
 * 
 * Analyzes your project and provides tailored advice on which MCP servers
 * to use based on your technology stack and workflow patterns.
 */

import chalk from 'chalk';
import { AdvisoryEngine } from '../../lib/advisory-engine.js';
import { ResponseFormatter } from '../../lib/response-formatter.js';

export default {
  name: 'advisor',
  description: 'Get intelligent MCP server recommendations for your project',
  usage: '/mcp-helper advisor [--report] [--interactive]',
  
  /**
   * Execute the advisor command
   * @param {Object} context - Command context with utilities
   * @returns {Promise<Object>} - Execution result
   */
  async execute(context) {
    const { args = [] } = context;
    
    const generateReport = args.includes('--report') || args.includes('-r');
    const interactive = args.includes('--interactive') || args.includes('-i');
    
    try {
      const advisoryEngine = new AdvisoryEngine();
      const responseFormatter = new ResponseFormatter();
      
      console.log(chalk.bold.cyan('\n🧠 MCP Server Advisory System\n'));
      console.log('Analyzing your project...\n');
      
      // Get advice
      const advice = await advisoryEngine.getAdvice({
        projectPath: process.cwd()
      });
      
      if (interactive) {
        // Run interactive advisory session
        const result = await advisoryEngine.runInteractiveAdvisory();
        return {
          message: '✅ Advisory session complete',
          data: result
        };
      }
      
      if (generateReport) {
        // Generate and save report
        const report = await advisoryEngine.generateReport();
        const fs = await import('fs-extra');
        const path = await import('path');
        
        const reportPath = path.join(process.cwd(), 'mcp-advisory-report.md');
        await fs.writeFile(reportPath, report);
        
        console.log(chalk.green(`📄 Report saved to: ${reportPath}\n`));
        
        return {
          message: '✅ Advisory report generated',
          data: {
            reportPath,
            recommendations: advice.recommendations.length,
            warnings: advice.warnings.length
          }
        };
      }
      
      // Display recommendations
      if (advice.recommendations.length > 0) {
        console.log(chalk.bold('📦 Recommended Servers:\n'));
        
        const essential = advice.recommendations.filter(r => r.priority === 'essential');
        const recommended = advice.recommendations.filter(r => r.priority === 'recommended');
        const optional = advice.recommendations.filter(r => r.priority === 'optional');
        
        if (essential.length > 0) {
          console.log(chalk.bold.green('Essential:'));
          for (const rec of essential) {
            const formatted = await responseFormatter.formatServerRecommendation(
              rec.card || { name: rec.name, humanRating: 0, aiAgentRating: 0, runtime: 'unknown' },
              rec.reason
            );
            console.log(formatted);
          }
          console.log();
        }
        
        if (recommended.length > 0) {
          console.log(chalk.bold.cyan('Recommended:'));
          for (const rec of recommended) {
            const formatted = await responseFormatter.formatServerRecommendation(
              rec.card || { name: rec.name, humanRating: 0, aiAgentRating: 0, runtime: 'unknown' },
              rec.reason
            );
            console.log(formatted);
          }
          console.log();
        }
        
        if (optional.length > 0) {
          console.log(chalk.gray('Optional:'));
          for (const rec of optional) {
            console.log(`  • ${rec.name}: ${rec.reason}`);
          }
          console.log();
        }
      } else {
        console.log('No new server recommendations at this time.\n');
      }
      
      // Display warnings
      if (advice.warnings.length > 0) {
        console.log(chalk.bold.yellow('⚠️  Configuration Warnings:\n'));
        advice.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning.message}`));
        });
        console.log();
      }
      
      // Display optimizations
      if (advice.optimizations.length > 0) {
        console.log(chalk.bold('💡 Optimization Suggestions:\n'));
        advice.optimizations.forEach(opt => {
          console.log(`  • ${opt.message}`);
          if (opt.suggestion) {
            console.log(chalk.gray(`    ${opt.suggestion}`));
          }
        });
        console.log();
      }
      
      // Display tips
      if (advice.tips.length > 0) {
        console.log(chalk.bold('📝 Tips:\n'));
        const grouped = {};
        advice.tips.forEach(tip => {
          if (!grouped[tip.category]) {
            grouped[tip.category] = [];
          }
          grouped[tip.category].push(tip.tip);
        });
        
        Object.entries(grouped).forEach(([category, tips]) => {
          console.log(chalk.bold(`  ${category}:`));
          tips.forEach(tip => {
            console.log(`    • ${tip}`);
          });
        });
        console.log();
      }
      
      // Action items
      const actions = [];
      if (essential && essential.length > 0) {
        actions.push(`Add essential servers: /mcp-helper add ${essential[0].name}`);
      }
      if (advice.warnings.some(w => w.type === 'missing_env')) {
        actions.push('Set up missing environment variables in your .env file');
      }
      
      return {
        message: '✅ Advisory analysis complete',
        data: {
          recommendations: advice.recommendations.length,
          warnings: advice.warnings.length,
          optimizations: advice.optimizations.length,
          tips: advice.tips.length
        },
        nextSteps: actions.length > 0 ? actions : [
          'Your configuration looks good!',
          'Use `/mcp-helper list` to see all configured servers'
        ]
      };
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Advisory analysis failed: ${error.message}`));
      
      return {
        message: `❌ Advisory failed: ${error.message}`,
        error: error.stack
      };
    }
  }
};