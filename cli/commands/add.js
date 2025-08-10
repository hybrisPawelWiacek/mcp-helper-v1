import { BaseCommand } from '../base-command.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class AddCommand extends BaseCommand {
  constructor() {
    super('add', 'Add an MCP server to your configuration');
    this.aliases = ['install'];
  }

  getUsage() {
    return 'Usage: /mcp-helper add <server-name>';
  }

  getExamples() {
    return `${this.colors.yellow}Examples:${this.colors.reset}
  /mcp-helper add github        Add GitHub MCP server
  /mcp-helper add serena        Add Serena code analysis server`;
  }

  async execute(args) {
    const serverName = args._[0];
    if (!serverName) {
      this.error('Server name is required');
      this.info('Run: /mcp-helper list to see available servers');
      return;
    }
    
    // Call original implementation
    const scriptPath = path.join(__dirname, '..', 'mcp-helper-add.js');
    const proc = spawn('node', [scriptPath, serverName], {
      stdio: 'inherit',
      env: process.env
    });
    
    return new Promise((resolve, reject) => {
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Command exited with code ${code}`));
      });
    });
  }
}