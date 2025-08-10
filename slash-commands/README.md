# Claude Code Slash Commands

This directory contains the implementation of MCP-Helper slash commands for Claude Code.

## Overview

These slash commands are designed to work within the Claude Code chat interface, allowing users to manage MCP servers conversationally without leaving their chat session.

## Architecture

```
slash-commands/
├── index.js              # Command registry and main entry point
├── commands/             # Individual command handlers
│   ├── init.js          # Initialize MCP configuration
│   ├── add.js           # Add server from catalog
│   ├── list.js          # List configured servers
│   ├── reconfigure.js   # Modify server configuration
│   ├── add-custom.js    # Add custom server
│   └── help.js          # Show help information
└── README.md            # This file
```

## How It Works

1. **Command Detection**: Claude Code detects slash commands starting with `/mcp-helper`
2. **Command Parsing**: The registry parses the command and extracts arguments
3. **Handler Execution**: The appropriate command handler is loaded and executed
4. **Response Formatting**: Results are formatted for display in the chat interface

## Available Commands

### `/mcp-helper init`
Initialize MCP configuration for your project.
- Detects environment
- Creates .env file
- Generates CLAUDE.md

### `/mcp-helper add <server>`
Add an MCP server from the catalog.
- Shows server ratings
- Lists required environment variables
- Updates configuration

### `/mcp-helper list`
List all MCP servers.
- Shows configured servers
- Displays available servers
- Provides recommendations

### `/mcp-helper reconfigure <server>`
Modify existing server configuration.
- Updates to latest version
- Preserves environment variables
- Shows changes

### `/mcp-helper add-custom`
Add a custom MCP server.
- Checks for foundation servers
- Provides configuration examples
- Guides through setup

### `/mcp-helper help [command]`
Show help information.
- General help without arguments
- Command-specific help with command name

## Integration with Claude Code

The slash commands integrate with Claude Code through:

1. **handleSlashCommand()**: Main entry point called by Claude
2. **SlashCommandRegistry**: Manages command registration and routing
3. **Command Handlers**: Individual modules for each command
4. **Shared Libraries**: Reuses lib/ modules for configuration management

## Usage Example

```javascript
// When Claude detects a slash command:
const input = '/mcp-helper add github-official';
const result = await handleSlashCommand(input);

// Result contains formatted response for display:
{
  success: true,
  message: '✅ Successfully added "github-official"',
  data: { ... },
  nextSteps: [ ... ]
}
```

## Testing Slash Commands

To test these commands in Claude Code:

1. Ensure the commands are properly registered
2. Type a slash command in the chat: `/mcp-helper init`
3. Claude will execute the command and display the result
4. Follow the interactive prompts and guidance

## Development Notes

- Commands are lazy-loaded for performance
- Each handler is a self-contained module
- Responses are structured for easy parsing
- Error handling provides helpful feedback
- Commands share utilities through context object

## See Also

- [CLI Implementation](../cli/) - Standalone CLI tool
- [Library Modules](../lib/) - Shared configuration utilities
- [Server Cards](../catalog/server_cards/) - MCP server metadata
