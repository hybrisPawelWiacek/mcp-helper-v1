import { BaseCommand } from '../base-command.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class AddCustomCommand extends BaseCommand {
  constructor() {
    super('add-custom', 'Add a custom MCP server not in the catalog');
    this.aliases = ['custom'];
  }

  async execute(args) {
    const scriptPath = path.join(__dirname, '..', 'mcp-helper-add-custom.js');
    const proc = spawn('node', [scriptPath], {
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