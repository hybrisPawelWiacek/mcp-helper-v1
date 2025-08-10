/**
 * Personality Manager for MCP Helper
 * Manages user communication preferences and interaction styles
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PersonalityManager {
  constructor() {
    this.preferencesDir = path.join(os.homedir(), '.mcp-helper');
    this.preferencesPath = path.join(this.preferencesDir, 'preferences.json');
    this.templatesDir = path.join(__dirname, '..', 'templates', 'personalities');
    this.preferences = null;
    this.defaultPreferences = {
      expertise: 'balanced',      // expert | balanced | student
      verbosity: 'balanced',       // concise | balanced | detailed
      tone: 'friendly',           // formal | friendly | casual
      guidance: 'proactive',      // proactive | reactive | minimal
      emoji: true,                // use emojis in responses
      codeExamples: 'annotated',  // minimal | annotated | comprehensive
      errorHandling: 'educational', // brief | educational | detailed
      onboardingCompleted: false,
      installedAt: new Date().toISOString()
    };
  }

  /**
   * Initialize preferences (load or create)
   */
  async initialize() {
    await fs.ensureDir(this.preferencesDir);
    
    if (await fs.pathExists(this.preferencesPath)) {
      this.preferences = await fs.readJson(this.preferencesPath);
      // Merge with defaults for any missing keys
      this.preferences = { ...this.defaultPreferences, ...this.preferences };
    } else {
      this.preferences = { ...this.defaultPreferences };
      await this.save();
    }
    
    return this.preferences;
  }

  /**
   * Get current preferences
   */
  getPreferences() {
    return this.preferences || this.defaultPreferences;
  }

  /**
   * Update preferences
   */
  async updatePreferences(updates) {
    this.preferences = { ...this.preferences, ...updates };
    await this.save();
    return this.preferences;
  }

  /**
   * Save preferences to disk
   */
  async save() {
    await fs.writeJson(this.preferencesPath, this.preferences, { spaces: 2 });
  }

  /**
   * Load all available personality templates
   */
  async loadTemplates() {
    const indexPath = path.join(this.templatesDir, 'index.json');
    if (!await fs.pathExists(indexPath)) {
      return [];
    }
    
    const index = await fs.readJson(indexPath);
    const templates = [];
    
    for (const template of index.templates) {
      const templatePath = path.join(this.templatesDir, template.file);
      if (await fs.pathExists(templatePath)) {
        const data = await fs.readJson(templatePath);
        templates.push({
          ...template,
          ...data
        });
      }
    }
    
    return templates;
  }

  /**
   * Load a specific personality template
   */
  async loadTemplate(templateId) {
    const templates = await this.loadTemplates();
    return templates.find(t => t.id === templateId);
  }

  /**
   * Apply a personality template
   */
  async applyTemplate(templateId) {
    const template = await this.loadTemplate(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }
    
    const preferences = {
      ...this.preferences,
      ...template.preferences,
      template: templateId,
      templateName: template.name,
      templateAppliedAt: new Date().toISOString()
    };
    
    this.preferences = preferences;
    await this.save();
    return preferences;
  }

  /**
   * Get template recommendations based on user profile
   */
  async getTemplateRecommendations(userProfile = {}) {
    const templates = await this.loadTemplates();
    const { experience, environment, preference } = userProfile;
    
    const indexPath = path.join(this.templatesDir, 'index.json');
    const index = await fs.readJson(indexPath);
    const guide = index.selection_guide;
    
    const recommendations = [];
    
    // Score each template
    for (const template of templates) {
      let score = 0;
      
      if (experience && guide.by_experience[experience]?.includes(template.id)) {
        score += 3;
      }
      
      if (environment && guide.by_environment[environment]?.includes(template.id)) {
        score += 2;
      }
      
      if (preference && guide.by_preference[preference]?.includes(template.id)) {
        score += 1;
      }
      
      if (template.default) {
        score += 0.5;
      }
      
      if (score > 0) {
        recommendations.push({
          ...template,
          score,
          reasons: []
        });
      }
    }
    
    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);
    
    return recommendations.slice(0, 3); // Return top 3
  }

  /**
   * Get personality profile description
   */
  getPersonalityProfile() {
    const prefs = this.getPreferences();
    
    const profiles = {
      expert: {
        name: 'Expert Mode',
        description: 'Technical, concise communication for experienced developers',
        traits: ['Assumes technical knowledge', 'Minimal explanations', 'Focus on efficiency']
      },
      balanced: {
        name: 'Balanced Mode',
        description: 'Clear explanations with appropriate technical depth',
        traits: ['Explains key concepts', 'Provides context', 'Offers best practices']
      },
      student: {
        name: 'Learning Mode',
        description: 'Educational approach with detailed explanations',
        traits: ['Step-by-step guidance', 'Explains terminology', 'Provides learning resources']
      }
    };
    
    return profiles[prefs.expertise] || profiles.balanced;
  }

  /**
   * Get response style configuration
   */
  getResponseStyle() {
    const prefs = this.getPreferences();
    
    return {
      // Message formatting
      useEmoji: prefs.emoji,
      useBulletPoints: prefs.verbosity !== 'concise',
      useHeaders: prefs.verbosity === 'detailed',
      
      // Explanation depth
      explainCommands: prefs.expertise === 'student',
      explainConcepts: prefs.expertise !== 'expert',
      showAlternatives: prefs.verbosity !== 'concise',
      
      // Code examples
      includeComments: prefs.codeExamples !== 'minimal',
      includeExplanations: prefs.codeExamples === 'comprehensive',
      
      // Error handling
      explainErrors: prefs.errorHandling !== 'brief',
      suggestFixes: prefs.errorHandling !== 'brief',
      provideContext: prefs.errorHandling === 'detailed',
      
      // Guidance level
      offerNextSteps: prefs.guidance === 'proactive',
      suggestBestPractices: prefs.guidance !== 'minimal',
      provideWarnings: prefs.guidance === 'proactive'
    };
  }

  /**
   * Format a message according to personality preferences
   */
  formatMessage(message, type = 'info') {
    const style = this.getResponseStyle();
    const prefs = this.getPreferences();
    
    // Add emoji if enabled
    if (style.useEmoji) {
      const emojis = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: '💡',
        tip: '💡',
        question: '❓',
        step: '👉'
      };
      
      if (emojis[type] && !message.startsWith(emojis[type])) {
        message = `${emojis[type]} ${message}`;
      }
    }
    
    // Adjust verbosity
    if (prefs.verbosity === 'concise' && message.length > 100) {
      // Keep it brief
      message = message.split('.')[0] + '.';
    }
    
    return message;
  }

  /**
   * Get onboarding questions based on current preferences
   */
  getOnboardingQuestions() {
    return [
      {
        key: 'expertise',
        question: 'What\'s your experience level with MCP servers?',
        options: [
          { value: 'expert', label: 'Expert - I know MCP well', description: 'Minimal explanations, focus on efficiency' },
          { value: 'balanced', label: 'Intermediate - Some experience', description: 'Clear explanations with context' },
          { value: 'student', label: 'Beginner - New to MCP', description: 'Detailed guidance and learning resources' }
        ]
      },
      {
        key: 'verbosity',
        question: 'How much detail do you prefer?',
        options: [
          { value: 'concise', label: 'Concise - Just the essentials', description: 'Brief, to-the-point responses' },
          { value: 'balanced', label: 'Balanced - Moderate detail', description: 'Clear explanations without overwhelming' },
          { value: 'detailed', label: 'Detailed - Full explanations', description: 'Comprehensive information and context' }
        ]
      },
      {
        key: 'tone',
        question: 'What communication style do you prefer?',
        options: [
          { value: 'formal', label: 'Formal - Professional', description: 'Technical, professional language' },
          { value: 'friendly', label: 'Friendly - Approachable', description: 'Warm, helpful tone' },
          { value: 'casual', label: 'Casual - Conversational', description: 'Relaxed, informal style' }
        ]
      },
      {
        key: 'guidance',
        question: 'How much guidance would you like?',
        options: [
          { value: 'proactive', label: 'Proactive - Suggest next steps', description: 'Recommendations and best practices' },
          { value: 'reactive', label: 'Reactive - Answer when asked', description: 'Respond to specific questions' },
          { value: 'minimal', label: 'Minimal - Just the facts', description: 'Essential information only' }
        ]
      },
      {
        key: 'emoji',
        question: 'Use emojis in responses?',
        options: [
          { value: true, label: 'Yes - Visual indicators help', description: '✅ ❌ 💡' },
          { value: false, label: 'No - Text only please', description: 'Plain text responses' }
        ]
      }
    ];
  }

  /**
   * Check if onboarding is needed
   */
  needsOnboarding() {
    return !this.preferences?.onboardingCompleted;
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding() {
    await this.updatePreferences({ 
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString()
    });
  }

  /**
   * Reset preferences to defaults
   */
  async reset() {
    this.preferences = { ...this.defaultPreferences };
    await this.save();
    return this.preferences;
  }

  /**
   * Export preferences for backup
   */
  async export() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      preferences: this.preferences
    };
  }

  /**
   * Import preferences from backup
   */
  async import(data) {
    if (data.version && data.preferences) {
      this.preferences = { ...this.defaultPreferences, ...data.preferences };
      await this.save();
      return true;
    }
    return false;
  }
}

export default PersonalityManager;