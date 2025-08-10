/**
 * Response Formatter - Formats messages based on user personality preferences
 * Integrates with PersonalityManager to provide consistent, tailored communication
 */

import chalk from 'chalk';
import { PersonalityManager } from './personality-manager.js';

export class ResponseFormatter {
  constructor(personalityManager = null) {
    this.personalityManager = personalityManager || new PersonalityManager();
  }

  /**
   * Format a message based on user preferences
   * @param {string} message - The base message to format
   * @param {Object} options - Formatting options
   * @returns {string} Formatted message
   */
  async format(message, options = {}) {
    const preferences = await this.personalityManager.getPreferences();
    
    // Apply verbosity adjustments
    message = this.adjustVerbosity(message, preferences.verbosity, options);
    
    // Apply tone adjustments
    message = this.adjustTone(message, preferences.tone, options);
    
    // Apply expertise level adjustments
    message = this.adjustExpertiseLevel(message, preferences.expertiseLevel, options);
    
    // Apply color and styling if enabled
    if (preferences.coloredOutput !== false) {
      message = this.applyColors(message, options);
    }
    
    // Add emojis if preferred
    if (preferences.useEmojis) {
      message = this.addEmojis(message, options);
    }
    
    return message;
  }

  /**
   * Adjust message verbosity
   */
  adjustVerbosity(message, verbosity, options) {
    if (options.skipVerbosity) return message;
    
    switch (verbosity) {
      case 'minimal':
        // Strip explanations, keep only essential info
        if (options.type === 'success') {
          return message.split('.')[0] + '.';
        }
        if (options.type === 'error') {
          return `Error: ${options.shortError || message.split(':').pop().trim()}`;
        }
        return message.split('\n')[0];
        
      case 'concise':
        // Keep main points, remove examples
        if (options.examples) {
          return message.replace(/\n\n?Examples?:[\s\S]*?(?=\n\n|$)/g, '');
        }
        return message;
        
      case 'verbose':
        // Add additional context if available
        if (options.additionalContext) {
          message += `\n\n${options.additionalContext}`;
        }
        if (options.examples && !message.includes('Example')) {
          message += `\n\nExamples:\n${options.examples}`;
        }
        return message;
        
      default: // balanced
        return message;
    }
  }

  /**
   * Adjust message tone
   */
  adjustTone(message, tone, options) {
    if (options.skipTone) return message;
    
    switch (tone) {
      case 'casual':
        // Use contractions and informal language
        message = message
          .replace(/\bcannot\b/g, "can't")
          .replace(/\bwill not\b/g, "won't")
          .replace(/\bdo not\b/g, "don't")
          .replace(/\bConfiguration successful\b/g, 'All set!')
          .replace(/\bError occurred\b/g, 'Oops, something went wrong')
          .replace(/\bPlease\b/g, 'Just');
        break;
        
      case 'formal':
        // Use formal language
        message = message
          .replace(/\bcan't\b/g, 'cannot')
          .replace(/\bwon't\b/g, 'will not')
          .replace(/\bdon't\b/g, 'do not')
          .replace(/\bAll set!\b/g, 'Configuration completed successfully')
          .replace(/\bOops\b/g, 'Error');
        break;
        
      case 'friendly':
        // Add warmth to messages
        if (options.type === 'success') {
          message = `Great! ${message}`;
        }
        if (options.type === 'info' && !message.startsWith('Let')) {
          message = `Let me help you with that. ${message}`;
        }
        break;
        
      default: // neutral
        // Keep as is
        break;
    }
    
    return message;
  }

  /**
   * Adjust for expertise level
   */
  adjustExpertiseLevel(message, level, options) {
    if (options.skipExpertise) return message;
    
    switch (level) {
      case 'expert':
        // Remove obvious explanations
        message = message.replace(/\n\n?Note: .*?(?=\n|$)/g, '');
        message = message.replace(/\n\n?Tip: .*?(?=\n|$)/g, '');
        
        // Add technical details if available
        if (options.technicalDetails) {
          message += `\n\nTechnical: ${options.technicalDetails}`;
        }
        break;
        
      case 'student':
        // Add explanations and tips
        if (options.explanation && !message.includes(options.explanation)) {
          message += `\n\nExplanation: ${options.explanation}`;
        }
        if (options.tips) {
          message += `\n\nTips:\n${options.tips}`;
        }
        // Add definitions for technical terms
        if (options.glossary) {
          message += `\n\nTerms:\n${options.glossary}`;
        }
        break;
        
      default: // balanced
        // Include moderate explanations
        if (options.briefExplanation) {
          message += `\n\nNote: ${options.briefExplanation}`;
        }
        break;
    }
    
    return message;
  }

  /**
   * Apply color formatting
   */
  applyColors(message, options) {
    // Apply semantic colors based on message type
    switch (options.type) {
      case 'success':
        return chalk.green(message);
      case 'error':
        return chalk.red(message);
      case 'warning':
        return chalk.yellow(message);
      case 'info':
        return chalk.cyan(message);
      case 'heading':
        return chalk.bold.blue(message);
      case 'code':
        return chalk.gray(message);
      default:
        // Apply inline formatting
        message = message
          .replace(/`([^`]+)`/g, (match, code) => chalk.gray(code))
          .replace(/\*\*([^*]+)\*\*/g, (match, bold) => chalk.bold(bold))
          .replace(/\*([^*]+)\*/g, (match, italic) => chalk.italic(italic));
        return message;
    }
  }

  /**
   * Add contextual emojis
   */
  addEmojis(message, options) {
    const emojis = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      config: '⚙️',
      install: '📦',
      search: '🔍',
      database: '🗄️',
      api: '🔌',
      security: '🔒',
      update: '🔄',
      delete: '🗑️',
      add: '➕',
      remove: '➖',
      check: '✓',
      cross: '✗',
      star: '⭐',
      rocket: '🚀',
      thinking: '🤔',
      light: '💡'
    };
    
    // Add emoji based on message type
    if (options.type && emojis[options.type]) {
      message = `${emojis[options.type]} ${message}`;
    }
    
    // Add contextual emojis for specific keywords
    if (options.addInlineEmojis !== false) {
      message = message
        .replace(/\binstall(ed|ing)?\b/gi, `$& ${emojis.install}`)
        .replace(/\bconfig(ured|uring|uration)?\b/gi, `$& ${emojis.config}`)
        .replace(/\bsearch(ing|ed)?\b/gi, `$& ${emojis.search}`)
        .replace(/\bsecur(e|ity|ed)\b/gi, `$& ${emojis.security}`)
        .replace(/\bupdat(e|ed|ing)\b/gi, `$& ${emojis.update}`)
        .replace(/\bsuccess(ful|fully)?\b/gi, `$& ${emojis.success}`)
        .replace(/\berror\b/gi, `$& ${emojis.error}`)
        .replace(/\bwarning\b/gi, `$& ${emojis.warning}`);
    }
    
    return message;
  }

  /**
   * Format a server recommendation
   */
  async formatServerRecommendation(server, reason, options = {}) {
    const message = `
${server.name} (${server.runtime})
${reason}
Human Rating: ${server.humanRating}/5 | AI Agent Rating: ${server.aiAgentRating}/5
    `.trim();
    
    return this.format(message, {
      ...options,
      type: 'info',
      briefExplanation: server.description,
      technicalDetails: `Runtime: ${server.runtime}, Transport: ${server.transport}`
    });
  }

  /**
   * Format a list of items based on preferences
   */
  async formatList(items, options = {}) {
    const preferences = await this.personalityManager.getPreferences();
    let formatted = '';
    
    if (preferences.verbosity === 'minimal') {
      // Simple comma-separated list
      formatted = items.join(', ');
    } else if (preferences.useEmojis) {
      // Bulleted list with emojis
      formatted = items.map(item => `  • ${item}`).join('\n');
    } else {
      // Standard bulleted list
      formatted = items.map(item => `  - ${item}`).join('\n');
    }
    
    return this.format(formatted, options);
  }

  /**
   * Format a table based on preferences
   */
  async formatTable(headers, rows, options = {}) {
    const preferences = await this.personalityManager.getPreferences();
    
    if (preferences.verbosity === 'minimal') {
      // Just show the most important column
      const mainCol = options.mainColumn || 0;
      return rows.map(row => row[mainCol]).join(', ');
    }
    
    // Use the table formatter (could integrate with cli-table3)
    // For now, return a simple formatted table
    const widths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(r => String(r[i] || '').length)
      );
      return Math.min(maxLen, 30); // Cap at 30 chars
    });
    
    // Format header
    let table = headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + '\n';
    table += widths.map(w => '-'.repeat(w)).join('-|-') + '\n';
    
    // Format rows
    rows.forEach(row => {
      table += row.map((cell, i) => {
        const str = String(cell || '');
        return str.length > widths[i] 
          ? str.substring(0, widths[i] - 3) + '...'
          : str.padEnd(widths[i]);
      }).join(' | ') + '\n';
    });
    
    return this.format(table, { ...options, type: 'code' });
  }

  /**
   * Format an error message
   */
  async formatError(error, options = {}) {
    const preferences = await this.personalityManager.getPreferences();
    let message = error.message || String(error);
    
    // Add stack trace for experts
    if (preferences.expertiseLevel === 'expert' && error.stack) {
      message += `\n\nStack trace:\n${error.stack}`;
    }
    
    // Add helpful suggestions for students
    if (preferences.expertiseLevel === 'student' && options.suggestions) {
      message += `\n\nSuggestions:\n${options.suggestions}`;
    }
    
    return this.format(message, {
      ...options,
      type: 'error',
      shortError: message.split('\n')[0]
    });
  }

  /**
   * Format a prompt question
   */
  async formatPrompt(question, options = {}) {
    const preferences = await this.personalityManager.getPreferences();
    
    // Adjust question based on expertise
    if (preferences.expertiseLevel === 'expert') {
      // Keep it brief
      question = question.replace(/\s*\([^)]*\)/g, ''); // Remove parenthetical explanations
    } else if (preferences.expertiseLevel === 'student') {
      // Add helpful context if not present
      if (!question.includes('(') && options.helpText) {
        question += ` (${options.helpText})`;
      }
    }
    
    // Apply tone
    if (preferences.tone === 'casual') {
      question = question.replace(/^Please /, '');
    } else if (preferences.tone === 'formal') {
      if (!question.startsWith('Please')) {
        question = `Please ${question.charAt(0).toLowerCase()}${question.slice(1)}`;
      }
    }
    
    return this.format(question, { ...options, skipVerbosity: true });
  }

  /**
   * Create a progress message formatter
   */
  createProgressFormatter(totalSteps) {
    let currentStep = 0;
    
    return {
      next: async (message, options = {}) => {
        currentStep++;
        const progress = `[${currentStep}/${totalSteps}]`;
        const formatted = await this.format(`${progress} ${message}`, {
          ...options,
          type: 'info'
        });
        return formatted;
      },
      
      complete: async (message, options = {}) => {
        return this.format(message || 'Complete!', {
          ...options,
          type: 'success'
        });
      },
      
      error: async (message, options = {}) => {
        return this.formatError(message, options);
      }
    };
  }
}

// Export singleton instance for convenience
export const responseFormatter = new ResponseFormatter();