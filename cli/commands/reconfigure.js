import { BaseCommand } from '../base-command.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ReconfigureCommand extends BaseCommand {
  constructor() {
    super('reconfigure', 'Modify configuration for an existing MCP server');
    this.aliases = ['reconfig', 'update'];
  }

  getUsage() {
    return 'Usage: /mcp-helper reconfigure <server-name>';
  }

  async execute(args) {
    const serverName = args._[0];
    if (!serverName) {
      this.error('Server name is required');
      return;
    }
    
    const scriptPath = path.join(__dirname, '..', 'mcp-helper-reconfigure.js');
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