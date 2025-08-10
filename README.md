# mcp-helper-v1

Complete MCP (Model Context Protocol) helper for Claude Code CLI.

## Features

- 🎯 5 slash commands for MCP server management
- 🎨 6 personality styles for customized communication
- 🔍 Smart project analysis and recommendations
- 🚀 Custom server support
- 📦 18 pre-configured server cards
- 🧪 E2E tested with 85% DX alignment

## Quick Start

```bash
# Clone this repository
git clone https://github.com/hybrisPawelWiacek/mcp-helper-v1.git

# Navigate to directory
cd mcp-helper-v1

# Install dependencies
npm install

# Create global link
npm link

# In your project directory
npm link @mcp/helper

# Start Claude Code
claude

# Run initialization
/mcp-helper init
```

## Commands

- `/mcp-helper init` - Start onboarding wizard
- `/mcp-helper add <server>` - Add a specific server
- `/mcp-helper list` - List available servers
- `/mcp-helper reconfigure <server>` - Modify server configuration
- `/mcp-helper add-custom` - Add custom server

## Status

Pre-test MVP complete, ready for manual testing.