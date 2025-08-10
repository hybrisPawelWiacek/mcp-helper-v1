/**
 * /mcp-helper help - Show help and usage information
 * 
 * This slash command handler displays help information for all mcp-helper commands
 * within the Claude Code chat interface.
 */

export default {
  name: 'help',
  description: 'Show available commands and usage',
  usage: '/mcp-helper help [command]',
  
  /**
   * Execute the help command
   * @param {Object} context - Command context with utilities
   * @returns {Promise<Object>} - Execution result
   */
  async execute(context) {
    const { args } = context;
    
    // Check if help for specific command was requested
    if (args.length > 0) {
      const commandName = args[0];
      return this.getCommandHelp(commandName);
    }
    
    // Show general help
    return {
      message: '# 🚀 MCP-Helper Slash Commands',
      description: 'Manage MCP (Model Context Protocol) servers directly within Claude Code',
      commands: this.getAllCommands(),
      quickStart: {
        title: '## ⚡ Quick Start',
        steps: [
          '1. Initialize: `/mcp-helper init`',
          '2. Add a server: `/mcp-helper add github-official`',
          '3. List servers: `/mcp-helper list`',
          '4. Configure environment variables in .env',
          '5. Restart Claude Code to load servers'
        ]
      },
      essentialServers: {
        title: '## 🎯 Essential Servers',
        servers: [
          '• **serena** - Semantic code understanding (AI: 5/5)',
          '• **sequentialthinking** - Complex reasoning (AI: 5/5)',
          '• **memory** - Persistent context (AI: 5/5)',
          '• **github-official** - GitHub integration (AI: 5/5)',
          '• **context7** - Documentation access (AI: 5/5)'
        ]
      },
      usage: {
        title: '## 📖 Usage',
        format: '`/mcp-helper <command> [options]`',
        examples: [
          '`/mcp-helper init` - Initialize MCP configuration',
          '`/mcp-helper add serena` - Add the serena server',
          '`/mcp-helper list` - Show all servers',
          '`/mcp-helper reconfigure github-official` - Update server config',
          '`/mcp-helper add-custom` - Add a custom server',
          '`/mcp-helper help add` - Get help for the add command'
        ]
      },
      tips: {
        title: '## 💡 Tips',
        items: [
          '• Use tab completion for server names',
          '• Check ratings to prioritize server installation',
          '• Foundation servers (serena, sequentialthinking, context7) enable custom server analysis',
          '• Environment variables go in your project `.env` file',
          '• Restart Claude Code after configuration changes'
        ]
      },
      moreInfo: {
        title: '## 📚 More Information',
        links: [
          '• [MCP Documentation](https://modelcontextprotocol.io)',
          '• [Server Catalog](https://github.com/modelcontextprotocol/servers)',
          '• [Project Repository](https://github.com/YOUR_USERNAME/mcp-helper)'
        ]
      }
    };
  },
  
  /**
   * Get help for a specific command
   */
  getCommandHelp(commandName) {
    const commands = {
      init: {
        name: 'init',
        description: 'Initialize MCP configuration for your project',
        usage: '/mcp-helper init',
        details: [
          'Creates initial MCP configuration',
          'Detects project environment',
          'Creates .env file if needed',
          'Generates CLAUDE.md documentation'
        ],
        example: '/mcp-helper init',
        output: 'Creates ~/.claude.json and project .env file'
      },
      add: {
        name: 'add',
        description: 'Add an MCP server from the catalog',
        usage: '/mcp-helper add <server-name>',
        details: [
          'Adds server configuration to ~/.claude.json',
          'Shows required environment variables',
          'Updates CLAUDE.md documentation',
          'Displays server ratings and capabilities'
        ],
        example: '/mcp-helper add github-official',
        parameters: {
          'server-name': 'Name of the server from the catalog (e.g., serena, github-official)'
        }
      },
      list: {
        name: 'list',
        description: 'List all configured MCP servers',
        usage: '/mcp-helper list',
        details: [
          'Shows configured servers with status',
          'Displays available servers from catalog',
          'Shows ratings (Human and AI Agent)',
          'Provides recommendations'
        ],
        example: '/mcp-helper list',
        output: 'Table of configured and available servers'
      },
      reconfigure: {
        name: 'reconfigure',
        description: 'Modify an existing server configuration',
        usage: '/mcp-helper reconfigure <server-name>',
        details: [
          'Updates server with latest configuration',
          'Preserves existing environment variables',
          'Shows what changed',
          'Updates CLAUDE.md documentation'
        ],
        example: '/mcp-helper reconfigure postgres',
        parameters: {
          'server-name': 'Name of the configured server to update'
        }
      },
      'add-custom': {
        name: 'add-custom',
        description: 'Add a custom MCP server not in the catalog',
        usage: '/mcp-helper add-custom',
        details: [
          'Guides through custom server configuration',
          'Checks for foundation servers',
          'Provides configuration examples',
          'Can analyze custom server code'
        ],
        example: '/mcp-helper add-custom',
        requirements: [
          'Foundation servers recommended: serena, sequentialthinking, context7',
          'Server details: name, transport, runtime, command'
        ]
      },
      help: {
        name: 'help',
        description: 'Show help and usage information',
        usage: '/mcp-helper help [command]',
        details: [
          'Shows general help without arguments',
          'Shows command-specific help with command name',
          'Lists all available commands',
          'Provides usage examples'
        ],
        example: '/mcp-helper help add',
        parameters: {
          'command': 'Optional. Specific command to get help for'
        }
      }
    };
    
    const command = commands[commandName];
    
    if (!command) {
      return {
        message: `❌ Unknown command: "${commandName}"`,
        hint: 'Use `/mcp-helper help` to see all available commands',
        availableCommands: Object.keys(commands)
      };
    }
    
    return {
      message: `## 📖 Help: ${command.name}`,
      description: command.description,
      usage: `\`${command.usage}\``,
      details: command.details,
      parameters: command.parameters,
      requirements: command.requirements,
      example: {
        title: '### Example',
        command: `\`${command.example}\``,
        output: command.output
      },
      related: this.getRelatedCommands(commandName)
    };
  },
  
  /**
   * Get all available commands
   */
  getAllCommands() {
    return [
      {
        command: '`/mcp-helper init`',
        description: 'Initialize MCP configuration'
      },
      {
        command: '`/mcp-helper add <server>`',
        description: 'Add a server from the catalog'
      },
      {
        command: '`/mcp-helper list`',
        description: 'List all MCP servers'
      },
      {
        command: '`/mcp-helper reconfigure <server>`',
        description: 'Modify server configuration'
      },
      {
        command: '`/mcp-helper add-custom`',
        description: 'Add a custom server'
      },
      {
        command: '`/mcp-helper help [command]`',
        description: 'Show help information'
      }
    ];
  },
  
  /**
   * Get related commands
   */
  getRelatedCommands(commandName) {
    const relations = {
      init: ['add', 'list'],
      add: ['list', 'reconfigure', 'add-custom'],
      list: ['add', 'reconfigure'],
      reconfigure: ['list', 'add'],
      'add-custom': ['add', 'list'],
      help: ['init']
    };
    
    const related = relations[commandName] || [];
    
    return related.length > 0 ? {
      title: '### See Also',
      commands: related.map(cmd => `\`/mcp-helper ${cmd}\``)
    } : null;
  }
};