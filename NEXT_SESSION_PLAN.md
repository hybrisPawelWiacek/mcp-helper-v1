# MCP-Helper: Next Session Plan

## 🚨 CRITICAL DISCOVERY
**Claude Code slash commands are Markdown templates, NOT JavaScript executables!**

This changes our entire implementation strategy. We need to restructure the project.

## Current Status (2025-01-10)
- **Overall Progress**: 95% complete
- **Server Cards**: 100% complete (all 18 cards done)
- **Slash Commands**: Need complete restructuring
- **NPM Package**: Ready for restructuring

## Completed Today
✅ All 5 remaining server cards:
- puppeteer.json (browser automation)
- playwright.json (cross-browser testing) 
- linkedin-mcp-server.json (LinkedIn data extraction)
- docker-mcp-toolkit.json (gateway to multiple MCP servers)
- claude-code.json (Claude Code tools as MCP)

✅ Discovered the true nature of slash commands (Markdown templates)
✅ Designed new hybrid architecture

## New Architecture (MUST IMPLEMENT)

### Directory Structure
```
@mcp/helper/
├── commands/                    # Markdown templates (what Claude sees)
│   ├── mcp-helper-init.md
│   ├── mcp-helper-add.md
│   ├── mcp-helper-list.md
│   ├── mcp-helper-reconfigure.md
│   └── mcp-helper-add-custom.md
├── backend/                     # Node.js implementation (actual logic)
│   ├── cli.js                  # Commander CLI entry point
│   ├── lib/                    # Move existing libraries here
│   ├── catalog/                # Move server cards here
│   └── templates/              # Move templates here
├── postinstall.js              # Copies .md files to ~/.claude/commands/
└── package.json                # NPM package configuration
```

### Installation Flow
1. User: "let's install mcp-helper"
2. Claude: "Run `npm install -g @mcp/helper`"
3. NPM runs postinstall → copies .md files to ~/.claude/commands/
4. User restarts Claude Code
5. Commands appear in /help

### How It Works
- Markdown templates contain prompts that tell Claude to run backend
- Example: `/mcp-helper add serena` → runs `npx @mcp/helper backend add serena`
- Backend does the actual work (modifying ~/.claude.json, etc.)

## Tasks for Next Session (IN ORDER)

### 1. Restructure Project
- [ ] Create `commands/` directory
- [ ] Create `backend/` directory
- [ ] Move `lib/`, `catalog/`, `templates/` into `backend/`
- [ ] Move slash-commands/*.js logic into backend/cli.js

### 2. Create Markdown Templates
- [ ] Convert mcp-helper-init.js → mcp-helper-init.md
- [ ] Convert mcp-helper-add.js → mcp-helper-add.md
- [ ] Convert mcp-helper-list.js → mcp-helper-list.md
- [ ] Convert mcp-helper-reconfigure.js → mcp-helper-reconfigure.md
- [ ] Convert mcp-helper-add-custom.js → mcp-helper-add-custom.md

### 3. Create Backend CLI
```javascript
// backend/cli.js
#!/usr/bin/env node
const { program } = require('commander');

program
  .command('init')
  .action(/* existing init logic */);

program
  .command('add <server>')
  .action(/* existing add logic */);

// etc...
```

### 4. Create Installer
```javascript
// postinstall.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Copy .md files to ~/.claude/commands/
// Show success message
// Remind user to restart Claude
```

### 5. Update package.json
```json
{
  "name": "@mcp/helper",
  "bin": {
    "mcp-helper": "./backend/cli.js"
  },
  "scripts": {
    "postinstall": "node postinstall.js"
  }
}
```

### 6. Test Installation
1. npm pack (create local package)
2. npm install -g mcp-helper-1.0.0.tgz
3. Verify .md files in ~/.claude/commands/
4. Restart Claude Code
5. Test all commands

### 7. Document & Ship
- [ ] Update README with installation instructions
- [ ] Create demo video/screenshots
- [ ] Publish to NPM registry

## Key Files to Reference
- `INSTALLATION_DESIGN.md` - Complete architectural design
- `PROJECT_STATUS.json` - Current project status
- `catalog/server_cards/` - All 18 completed server cards

## Remember
- NO hot-reload - users must restart Claude after install
- Markdown templates are prompts, not code
- Backend does the actual work via npx or direct execution
- This is a fundamental pivot but makes the tool work correctly with Claude Code

## Success Criteria
- User can install with single npm command
- Commands appear in /help after restart
- All 5 commands work correctly
- Clean separation between UI (Markdown) and logic (Node.js)