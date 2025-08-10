/**
 * Status Manager for MCP Helper
 * Single source of truth for project status tracking
 * Maintains consistency across CLAUDE.md, memory, and TodoWrite
 */

import fs from 'fs-extra';
import path from 'path';

export class StatusManager {
  constructor() {
    this.statusPath = path.join(process.cwd(), 'PROJECT_STATUS.json');
    this.backupDir = path.join(process.env.HOME, '.mcp-helper', 'status-backups');
  }

  /**
   * Read current project status
   */
  async readStatus() {
    try {
      if (await fs.pathExists(this.statusPath)) {
        return await fs.readJson(this.statusPath);
      }
      // Return default status if file doesn't exist
      return this.getDefaultStatus();
    } catch (error) {
      console.error('Error reading project status:', error);
      return this.getDefaultStatus();
    }
  }

  /**
   * Update project status with automatic timestamp
   */
  async updateStatus(updates) {
    try {
      const currentStatus = await this.readStatus();
      
      // Merge updates
      const newStatus = {
        ...currentStatus,
        ...updates,
        last_updated: new Date().toISOString()
      };
      
      // Validate structure
      if (!this.validateStatus(newStatus)) {
        throw new Error('Invalid status structure');
      }
      
      // Create backup before writing
      await this.backupStatus();
      
      // Write new status
      await fs.writeJson(this.statusPath, newStatus, { spaces: 2 });
      
      // Sync with memory if available
      await this.syncWithMemory(newStatus);
      
      return newStatus;
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
    }
  }

  /**
   * Update feature completion percentage
   */
  async updateFeatureCompletion(featureKey, completion) {
    const status = await this.readStatus();
    
    if (!status.features[featureKey]) {
      throw new Error(`Feature '${featureKey}' not found`);
    }
    
    status.features[featureKey].completion = completion;
    
    // Recalculate overall completion
    status.overall_completion = this.calculateOverallCompletion(status.features);
    
    return await this.updateStatus(status);
  }

  /**
   * Update todo status
   */
  async updateTodoStatus(todoId, newStatus) {
    const status = await this.readStatus();
    
    // Find and move todo between lists
    let todo = null;
    
    // Check all lists
    for (const list of ['pending', 'in_progress', 'completed_today']) {
      const index = status.todos[list].findIndex(t => t.id === todoId);
      if (index !== -1) {
        todo = status.todos[list].splice(index, 1)[0];
        break;
      }
    }
    
    if (!todo) {
      // Add new todo if not found
      todo = { id: todoId, content: `Task ${todoId}` };
    }
    
    // Add to appropriate list based on new status
    if (newStatus === 'completed') {
      status.todos.completed_today.push(todo);
    } else if (newStatus === 'in_progress') {
      status.todos.in_progress.push(todo);
    } else {
      status.todos.pending.push(todo);
    }
    
    return await this.updateStatus(status);
  }

  /**
   * Get feature status by key
   */
  async getFeatureStatus(featureKey) {
    const status = await this.readStatus();
    return status.features[featureKey] || null;
  }

  /**
   * Calculate overall completion based on features
   */
  calculateOverallCompletion(features) {
    const weights = {
      slash_commands: 0.3,
      custom_server_support: 0.3,
      server_cards: 0.25,
      npm_package: 0.15
    };
    
    let totalCompletion = 0;
    
    for (const [key, feature] of Object.entries(features)) {
      const weight = weights[key] || 0;
      totalCompletion += (feature.completion || 0) * weight;
    }
    
    return Math.round(totalCompletion);
  }

  /**
   * Validate status structure
   */
  validateStatus(status) {
    // Basic validation
    if (!status.project || !status.overall_completion || !status.features) {
      return false;
    }
    
    // Check required feature fields
    for (const feature of Object.values(status.features)) {
      if (!feature.name || typeof feature.completion !== 'number') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Create backup of current status
   */
  async backupStatus() {
    try {
      if (!await fs.pathExists(this.statusPath)) {
        return null;
      }
      
      await fs.ensureDir(this.backupDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `status-${timestamp}.json`);
      
      await fs.copy(this.statusPath, backupPath);
      
      // Keep only last 10 backups
      await this.cleanupBackups();
      
      return backupPath;
    } catch (error) {
      console.error('Error creating status backup:', error);
      return null;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(f => f.startsWith('status-'))
        .sort()
        .reverse();
      
      // Keep only last 10 backups
      for (let i = 10; i < backups.length; i++) {
        await fs.remove(path.join(this.backupDir, backups[i]));
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
    }
  }

  /**
   * Sync status with memory system
   * This would integrate with the memory MCP server
   */
  async syncWithMemory(status) {
    // This would be implemented to update the memory graph
    // For now, just log that sync would happen
    console.log('Status sync with memory: PROJECT_STATUS_CURRENT entity would be updated');
    
    // In a real implementation:
    // await memoryClient.updateEntity('PROJECT_STATUS_CURRENT', {
    //   observations: [
    //     `Overall completion: ${status.overall_completion}%`,
    //     `Last updated: ${status.last_updated}`,
    //     ...status.critical_notes
    //   ]
    // });
  }

  /**
   * Get default status structure
   */
  getDefaultStatus() {
    return {
      project: 'mcp-helper',
      description: 'Slash command extension for Claude Code CLI',
      overall_completion: 0,
      last_updated: new Date().toISOString(),
      features: {
        slash_commands: {
          name: 'Slash Commands',
          completion: 0,
          items: {}
        },
        custom_server_support: {
          name: 'Custom Server Support',
          completion: 0,
          items: {}
        },
        server_cards: {
          name: 'Server Cards',
          completion: 0,
          total: 18,
          completed: 0,
          items: [],
          remaining: []
        },
        npm_package: {
          name: 'NPM Package Deployment',
          completion: 0,
          items: {}
        }
      },
      todos: {
        pending: [],
        in_progress: [],
        completed_today: []
      },
      critical_notes: []
    };
  }

  /**
   * Generate status report for display
   */
  async generateReport() {
    const status = await this.readStatus();
    
    const report = [];
    report.push(`Project: ${status.project}`);
    report.push(`Overall Completion: ${status.overall_completion}%`);
    report.push(`Last Updated: ${status.last_updated}`);
    report.push('');
    report.push('Features:');
    
    for (const [key, feature] of Object.entries(status.features)) {
      report.push(`  ${feature.name}: ${feature.completion}%`);
      
      if (feature.items) {
        if (Array.isArray(feature.items)) {
          report.push(`    Completed: ${feature.items.join(', ')}`);
        } else {
          for (const [itemKey, item] of Object.entries(feature.items)) {
            report.push(`    - ${item.description}: ${item.status}`);
          }
        }
      }
      
      if (feature.remaining) {
        report.push(`    Remaining: ${feature.remaining.join(', ')}`);
      }
    }
    
    report.push('');
    report.push('Todos:');
    report.push(`  Pending: ${status.todos.pending.length}`);
    report.push(`  In Progress: ${status.todos.in_progress.length}`);
    report.push(`  Completed Today: ${status.todos.completed_today.length}`);
    
    if (status.critical_notes.length > 0) {
      report.push('');
      report.push('Critical Notes:');
      for (const note of status.critical_notes) {
        report.push(`  - ${note}`);
      }
    }
    
    return report.join('\n');
  }
}

export default StatusManager;