# MCP Helper Status Tracking Playbook

## Overview

The MCP Helper Status Tracking System provides a robust, single-source-of-truth solution for tracking project progress, managing todos, and maintaining consistency across different project management tools.

## Key Features

- **Single Source of Truth**: PROJECT_STATUS.json as the authoritative status source
- **Weighted Completion**: Smart calculation based on feature importance
- **Automatic Backups**: Preserves history with automatic backup management
- **CLAUDE.md Integration**: Dynamic status injection into project documentation
- **Memory Synchronization**: Optional sync with MCP memory servers
- **TodoWrite Compatibility**: Works alongside Claude Code's native todo system

## Architecture

```
┌─────────────────────────────────┐
│     PROJECT_STATUS.json         │  ← Single Source of Truth
└─────────────┬───────────────────┘
              │
      ┌───────▼────────┐
      │ StatusManager  │  ← Core Management Class
      └───────┬────────┘
              │
    ┌─────────┼─────────┬────────────┐
    ▼         ▼         ▼            ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
│CLAUDE.md│ │Memory│ │TodoWrite│ │Backups   │
└────────┘ └──────┘ └────────┘ └──────────┘
```

## Installation

### Quick Setup (Recommended)

```bash
# During project initialization
/mcp-helper init
# Answer "Yes" when prompted about status tracking

# Or standalone
/mcp-helper init-status
```

### Manual Setup

1. Copy template files:
```bash
cp templates/status-tracking/PROJECT_STATUS.template.json PROJECT_STATUS.json
cp templates/status-tracking/status-manager.template.js lib/status-manager.js
```

2. Update placeholders:
- Replace `{{PROJECT_NAME}}` with your project name
- Replace `{{USER_NAME}}` with your name
- Replace `{{TIMESTAMP}}` with current ISO timestamp

3. Initialize in code:
```javascript
import { StatusManager } from './lib/status-manager.js';
const statusManager = new StatusManager();
await statusManager.initialize('my-project');
```

## Configuration

### PROJECT_STATUS.json Structure

```json
{
  "project": "mcp-helper",
  "overall_completion": 90,
  "last_updated": "2025-01-10T12:00:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "created_by": "developer",
  "tracking_config": {
    "weighted_completion": true,
    "memory_sync": true,
    "auto_update_claudemd": true
  },
  "features": {
    "core_functionality": {
      "name": "Core Functionality",
      "completion": 100,
      "last_updated": "2025-01-10T12:00:00Z",
      "notes": "All slash commands implemented"
    },
    "documentation": {
      "name": "Documentation",
      "completion": 80,
      "last_updated": "2025-01-10T12:00:00Z"
    }
  },
  "todos": [
    {
      "id": "todo-123456",
      "content": "Add unit tests",
      "status": "in_progress",
      "created_at": "2025-01-10T10:00:00Z"
    }
  ],
  "critical_notes": [
    "Custom server support requires minimum servers installed"
  ],
  "metadata": {
    "version": "1.0.0",
    "schema": "mcp-helper-status-v1"
  }
}
```

### Weighted Completion Calculation

Default weights for common features:
- `core_functionality`: 40%
- `testing`: 20%
- `documentation`: 15%
- `deployment`: 15%
- `optimization`: 10%

Customize in StatusManager:
```javascript
calculateWeightedCompletion(features) {
  const weights = {
    your_feature: 0.5,  // 50% weight
    another_feature: 0.3 // 30% weight
    // Remaining features share remaining 20%
  };
  // ... calculation logic
}
```

## Usage Patterns

### Basic Operations

```javascript
import { StatusManager } from './lib/status-manager.js';
const statusManager = new StatusManager();

// Update feature progress
await statusManager.updateFeature('testing', 75, 'Unit tests complete');

// Add todo
const todoId = await statusManager.addTodo('Add integration tests');

// Update todo status
await statusManager.updateTodo(todoId, 'in_progress');
await statusManager.updateTodo(todoId, 'completed');

// Add critical note
await statusManager.addCriticalNote('Database migration required before v2.0');

// Generate report
const report = await statusManager.generateReport();
console.log(report);
```

### Integration with TodoWrite

The system works alongside Claude Code's TodoWrite:

```javascript
// In your workflow
import { StatusManager } from './lib/status-manager.js';

// After TodoWrite marks task complete
async function onTodoComplete(todo) {
  const statusManager = new StatusManager();
  
  // Update related feature
  if (todo.content.includes('testing')) {
    await statusManager.updateFeature('testing', 80);
  }
  
  // Sync todo to status
  await statusManager.updateTodo(todo.id, 'completed');
}
```

### CLAUDE.md Integration

When `auto_update_claudemd` is enabled:

```javascript
import { ClaudeMdGenerator } from './lib/claude-md-generator.js';
import { StatusManager } from './lib/status-manager.js';

const statusManager = new StatusManager();
const claudeMdGenerator = new ClaudeMdGenerator(configManager, serverCardsManager);

// Status is automatically included
await claudeMdGenerator.generate();
```

The Handlebars template receives:
```handlebars
## Project Status: {{projectStatus.project}} ({{projectStatus.overall_completion}}% Complete)

### Features Progress
{{#each projectStatus.features}}
- **{{this.name}}**: {{this.completion}}% complete
{{/each}}
```

### Memory Synchronization

When `memory_sync` is enabled:

```javascript
// Sync to memory server
async function syncToMemory() {
  const status = await statusManager.readStatus();
  
  // Using memory MCP server
  await memory.create_entities([{
    name: `project-status-${status.project}`,
    entityType: 'project_status',
    observations: [
      `Overall completion: ${status.overall_completion}%`,
      `Last updated: ${status.last_updated}`,
      JSON.stringify(status.features)
    ]
  }]);
}
```

## Best Practices

### 1. Update Frequency
- Update feature progress after completing major milestones
- Update todos in real-time as you work
- Review overall completion weekly

### 2. Feature Granularity
- Keep features high-level (5-10 max)
- Use todos for granular tasks
- Use notes for feature-specific details

### 3. Critical Notes
- Add notes for blockers immediately
- Include decision rationale
- Remove resolved notes promptly

### 4. Backup Management
- Automatic backups on every write
- Keeps last 10 backups
- Review `.status-backups/` if recovery needed

### 5. Consistency Checks
```javascript
// Regular consistency check
async function checkConsistency() {
  const statusManager = new StatusManager();
  const status = await statusManager.readStatus();
  
  // Verify calculations
  const calculated = statusManager.calculateOverallCompletion(status.features);
  if (calculated !== status.overall_completion) {
    console.warn('Completion mismatch detected');
    status.overall_completion = calculated;
    await statusManager.writeStatus(status);
  }
}
```

## Troubleshooting

### Common Issues

1. **Corrupted Status File**
```bash
# Restore from backup
cp .status-backups/status-backup-LATEST.json PROJECT_STATUS.json
```

2. **CLAUDE.md Not Updating**
```javascript
// Check configuration
const status = await statusManager.readStatus();
console.log(status.tracking_config.auto_update_claudemd);

// Manual update
await claudeMdGenerator.generate();
```

3. **Memory Sync Failures**
```bash
# Check memory server
/mcp list
# Ensure memory server is configured
/mcp-helper add memory
```

4. **Weight Calculation Issues**
```javascript
// Debug weights
const features = status.features;
const weights = statusManager.calculateWeightedCompletion(features);
console.log('Calculated:', weights);
```

## Advanced Usage

### Custom Status Reports

```javascript
class CustomReporter extends StatusManager {
  async generateHTMLReport() {
    const status = await this.readStatus();
    
    return `
      <html>
        <body>
          <h1>${status.project}</h1>
          <progress value="${status.overall_completion}" max="100">
            ${status.overall_completion}%
          </progress>
          <!-- ... more HTML ... -->
        </body>
      </html>
    `;
  }
}
```

### Webhook Integration

```javascript
async function notifyProgress() {
  const status = await statusManager.readStatus();
  
  if (status.overall_completion >= 90) {
    await fetch('https://hooks.slack.com/...', {
      method: 'POST',
      body: JSON.stringify({
        text: `Project ${status.project} is ${status.overall_completion}% complete!`
      })
    });
  }
}
```

### Git Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash
node -e "
  import('./lib/status-manager.js').then(({ StatusManager }) => {
    const sm = new StatusManager();
    sm.generateReport().then(console.log);
  });
"
```

## Migration Guide

### From Manual Tracking

```javascript
// Convert existing data
const oldData = {
  tasks: [...],
  progress: {...}
};

const statusManager = new StatusManager();
await statusManager.initialize('my-project');

// Migrate features
for (const [name, progress] of Object.entries(oldData.progress)) {
  await statusManager.updateFeature(name, progress);
}

// Migrate todos
for (const task of oldData.tasks) {
  await statusManager.addTodo(task.name);
}
```

### From Other Systems

```javascript
// Import from Jira/GitHub
const issues = await getJiraIssues();

for (const issue of issues) {
  if (issue.type === 'Epic') {
    await statusManager.updateFeature(
      issue.key,
      calculateProgress(issue),
      issue.summary
    );
  } else {
    await statusManager.addTodo(issue.summary);
  }
}
```

## API Reference

### StatusManager Class

#### Constructor
```javascript
new StatusManager(projectPath = process.cwd())
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `initialize(projectName)` | Create or load status file | `Promise<Status>` |
| `readStatus()` | Read current status | `Promise<Status>` |
| `writeStatus(status)` | Write status with backup | `Promise<boolean>` |
| `updateFeature(name, completion, notes)` | Update feature progress | `Promise<boolean>` |
| `addTodo(content)` | Add new todo | `Promise<string>` (id) |
| `updateTodo(id, status)` | Update todo status | `Promise<boolean>` |
| `addCriticalNote(note)` | Add critical note | `Promise<boolean>` |
| `generateReport()` | Generate markdown report | `Promise<string>` |
| `createBackup()` | Manual backup creation | `Promise<string>` (path) |

## Roadmap

### Version 1.1
- [ ] GraphQL API for status queries
- [ ] Real-time status updates via WebSocket
- [ ] Integration with GitHub Projects
- [ ] Custom weight profiles

### Version 1.2
- [ ] AI-powered progress estimation
- [ ] Automated feature detection
- [ ] Cross-project status aggregation
- [ ] Status history visualization

## Contributing

1. Use status tracking in your own project
2. Report issues and feedback
3. Submit PRs with improvements
4. Share custom templates and patterns

## License

MIT - Part of MCP Helper project

---

*Last Updated: 2025-01-10*
*Version: 1.0.0*