# MCP-Helper Installation Design

## Problem Statement
Claude Code slash commands are Markdown templates, not executable JavaScript files. Our current implementation needs to be restructured to work with Claude Code's command discovery system.

## Solution Architecture

### 1. Package Structure
```
@mcp/helper/
├── commands/                    # Markdown templates for Claude Code
│   ├── mcp-helper-init.md
│   ├── mcp-helper-add.md
│   ├── mcp-helper-list.md
│   ├── mcp-helper-reconfigure.md
│   └── mcp-helper-add-custom.md
├── backend/                     # Node.js implementation
│   ├── lib/                    # Our existing libraries
│   ├── catalog/                # Server cards
│   └── cli.js                 # Backend CLI entry point
├── bin/
│   └── mcp-helper-install     # Installation script
├── package.json
└── postinstall.js             # NPM postinstall hook
```

### 2. Installation Flow

#### Step 1: User Request
```
User: "let's install mcp-helper"
```

#### Step 2: Claude Response
```markdown
I'll help you install the MCP-Helper tool for managing MCP servers. Here's how:

1. Install the package globally:
   ```bash
   npm install -g @mcp/helper
   ```

2. The installer will:
   - Copy slash commands to ~/.claude/commands/
   - Set up the backend service
   - Create necessary directories

3. Restart Claude Code to load the new commands:
   ```bash
   # Exit current session (Ctrl+C or exit)
   claude
   ```

4. Verify installation:
   ```
   /help
   ```
   You should see the mcp-helper commands listed.
```

#### Step 3: NPM Installation
```javascript
// postinstall.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

async function postInstall() {
  const homeDir = os.homedir();
  const claudeCommandsDir = path.join(homeDir, '.claude', 'commands');
  
  // Ensure directory exists
  await fs.ensureDir(claudeCommandsDir);
  
  // Copy command templates
  const commandsDir = path.join(__dirname, 'commands');
  const commands = await fs.readdir(commandsDir);
  
  for (const cmd of commands) {
    if (cmd.endsWith('.md')) {
      const src = path.join(commandsDir, cmd);
      const dest = path.join(claudeCommandsDir, cmd);
      await fs.copy(src, dest, { overwrite: true });
      console.log(`✅ Installed command: ${cmd}`);
    }
  }
  
  console.log('\n🎉 MCP-Helper installed successfully!');
  console.log('⚠️  Please restart Claude Code to use the new commands.');
}
```

### 3. Command Templates

#### mcp-helper-init.md
```markdown
---
name: mcp-helper-init
description: Initialize MCP server configuration for your project
---

I'll help you initialize MCP server configuration for your project.

First, let me check your current environment and create the necessary configuration files.

```bash
# Run the MCP-Helper backend to initialize
npx @mcp/helper backend init
```

This will:
1. Detect your project type and environment
2. Create a .env file with placeholders for API keys
3. Set up foundation servers (serena, sequentialthinking, context7)
4. Generate initial CLAUDE.md documentation

[The backend will handle the actual initialization logic]
```

#### mcp-helper-add.md
```markdown
---
name: mcp-helper-add
description: Add a new MCP server to your configuration
arguments:
  - name: server
    description: Name of the server to add (or 'custom' for custom servers)
---

I'll help you add the {{server}} MCP server to your configuration.

```bash
# Run the MCP-Helper backend to add server
npx @mcp/helper backend add {{server}}
```

[The backend will handle the interactive configuration]
```

### 4. Backend Service

The backend service (`backend/cli.js`) will be a Node.js CLI that:
- Reads and writes ~/.claude.json
- Manages .env files
- Provides interactive prompts
- Updates CLAUDE.md

```javascript
#!/usr/bin/env node
// backend/cli.js

const { program } = require('commander');
const ConfigManager = require('./lib/config-manager');
const ServerCardsManager = require('./lib/server-cards');

program
  .command('init')
  .description('Initialize MCP configuration')
  .action(async () => {
    // Our existing init logic
  });

program
  .command('add <server>')
  .description('Add MCP server')
  .action(async (server) => {
    // Our existing add logic
  });

program.parse();
```

### 5. Developer Experience Benefits

1. **Familiar NPM Installation**: Users know `npm install -g`
2. **Auto-discovery**: Commands appear in `/help` after restart
3. **Clean Separation**: Markdown templates for UI, Node.js for logic
4. **Version Management**: NPM handles updates
5. **No Hot-Reload Needed**: One restart after install

### 6. Alternative Approaches Considered

#### A. Pure Markdown (No Backend)
- ❌ Can't manage complex configurations
- ❌ No interactive prompts
- ❌ Limited to what Claude can do

#### B. Manual Installation
- ❌ Poor DX - users copy files manually
- ❌ No version management
- ❌ Error-prone

#### C. Custom Claude Code Extension
- ❌ Not supported by Claude Code
- ❌ Would require Claude team changes

### 7. Implementation Plan

1. **Phase 1**: Convert .js files to .md templates
2. **Phase 2**: Create backend CLI service
3. **Phase 3**: Build NPM package with postinstall
4. **Phase 4**: Test installation flow
5. **Phase 5**: Publish to NPM

### 8. Key Insights

- Claude Code slash commands are **prompt templates**, not executables
- We need a **hybrid approach**: Markdown for Claude, Node.js for logic
- Installation must be **one-time** with restart, not hot-reload
- The backend runs **outside Claude** via `npx` or direct execution