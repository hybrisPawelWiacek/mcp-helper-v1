/**
 * /mcp-helper add-custom - Add a custom MCP server
 * 
 * This slash command handler adds a custom MCP server not in the catalog
 * within the Claude Code chat interface.
 */

export default {
  name: 'add-custom',
  description: 'Add a custom MCP server not in the catalog',
  usage: '/mcp-helper add-custom',
  
  /**
   * Execute the add-custom command
   * @param {Object} context - Command context with utilities
   * @returns {Promise<Object>} - Execution result
   */
  async execute(context) {
    const { configManager, serverCards, claudeMdGenerator } = context;
    
    try {
      // Check for minimum required servers
      const minimumServers = await this.checkMinimumServers(configManager);
      
      if (!minimumServers.allPresent) {
        return {
          message: '⚠️ Missing foundation servers for custom server analysis',
          missing: minimumServers.missing,
          explanation: 'Custom servers benefit from analysis by foundation servers:',
          requirements: [
            '• **serena**: Analyzes custom server code structure',
            '• **sequentialthinking**: Plans integration approach',
            '• **context7**: Fetches documentation'
          ],
          action: `Add missing servers first: ${minimumServers.missing.map(s => `/mcp-helper add ${s}`).join(', ')}`,
          override: 'You can still proceed manually by editing ~/.claude.json directly'
        };
      }
      
      // Guide user through custom server configuration
      return {
        message: '## 🔧 Custom MCP Server Configuration',
        instructions: {
          step1: {
            title: '1️⃣ Gather Server Information',
            items: [
              'Server name (unique identifier)',
              'Transport type (stdio, http, or sse)',
              'Runtime (npx, docker, uvx, or binary)',
              'Required environment variables',
              'Command and arguments to launch'
            ]
          },
          step2: {
            title: '2️⃣ Prepare Configuration',
            example: this.getConfigurationExample(),
            note: 'Choose the example that matches your server type'
          },
          step3: {
            title: '3️⃣ Add to Configuration',
            manual: {
              message: 'Edit ~/.claude.json and add your server configuration:',
              location: '~/.claude.json → mcpServers → [your-server-name]'
            },
            assisted: {
              message: 'Or provide the configuration details for assistance:',
              template: {
                name: 'your-server-name',
                transport: 'stdio|http|sse',
                runtime: 'npx|docker|uvx|binary',
                command: 'command-to-run',
                args: ['arg1', 'arg2'],
                env: {
                  ENV_VAR: '$ENV_VAR'
                }
              }
            }
          },
          step4: {
            title: '4️⃣ Set Environment Variables',
            items: [
              'Add required environment variables to your .env file',
              'Use format: VARIABLE_NAME=value',
              'Ensure no quotes around values unless needed'
            ]
          },
          step5: {
            title: '5️⃣ Test Your Server',
            items: [
              'Restart Claude Code: `claude`',
              'Verify server loads: `/mcp list`',
              'Test functionality: `claude "Using [server-name], ..."`'
            ]
          }
        },
        analysis: {
          available: true,
          message: '🤖 I can help analyze your custom server if you provide:',
          requirements: [
            'GitHub repository URL',
            'NPM package name',
            'Docker image name',
            'Or local file path to server code'
          ],
          command: 'Just share the server details and I\'ll help configure it!'
        },
        examples: {
          npm: {
            name: 'my-custom-server',
            command: 'npx',
            args: ['@myorg/my-server'],
            env: {
              API_KEY: '$MY_API_KEY'
            }
          },
          docker: {
            name: 'my-docker-server',
            command: 'docker',
            args: [
              'run', '-i', '--rm',
              '-e', 'CONFIG=$MY_CONFIG',
              'myorg/my-server:latest'
            ]
          },
          http: {
            name: 'my-http-server',
            url: 'http://localhost:3000',
            headers: {
              'Authorization': 'Bearer $MY_TOKEN'
            }
          }
        }
      };
    } catch (error) {
      return {
        message: `❌ Error preparing custom server guidance: ${error.message}`,
        error: error.stack
      };
    }
  },
  
  /**
   * Check if minimum required servers are present
   */
  async checkMinimumServers(configManager) {
    try {
      // Define required foundation servers
      const required = ['serena', 'sequentialthinking', 'context7'];
      
      // Check current configuration
      const config = await configManager.loadConfig();
      const configured = Object.keys(config?.mcpServers || {});
      
      const missing = required.filter(s => !configured.includes(s));
      
      return {
        allPresent: missing.length === 0,
        missing,
        configured: configured.filter(s => required.includes(s))
      };
    } catch {
      // If minimum servers file doesn't exist, return defaults
      return {
        allPresent: false,
        missing: ['serena', 'sequentialthinking', 'context7'],
        configured: []
      };
    }
  },
  
  /**
   * Get configuration examples for different server types
   */
  getConfigurationExample() {
    return {
      stdio: {
        npx: {
          description: 'NPX-based server (Node.js package)',
          config: {
            command: 'npx',
            args: ['package-name'],
            env: {
              API_KEY: '$API_KEY'
            }
          }
        },
        docker: {
          description: 'Docker-based server',
          config: {
            command: 'docker',
            args: [
              'run', '-i', '--rm',
              '-e', 'ENV_VAR=$ENV_VAR',
              '-v', '/local/path:/container/path',
              'image:tag'
            ]
          }
        },
        binary: {
          description: 'Binary executable',
          config: {
            command: '/path/to/binary',
            args: ['--arg1', 'value1'],
            env: {
              CONFIG_PATH: '/path/to/config'
            }
          }
        }
      },
      http: {
        description: 'HTTP/REST API server',
        config: {
          url: 'http://localhost:3000',
          headers: {
            'Authorization': 'Bearer $API_TOKEN',
            'Content-Type': 'application/json'
          }
        }
      },
      sse: {
        description: 'Server-Sent Events server',
        config: {
          url: 'http://localhost:8080/events',
          headers: {
            'X-API-Key': '$API_KEY'
          }
        }
      }
    };
  }
};