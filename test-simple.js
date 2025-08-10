#!/usr/bin/env node

console.log('Starting test...');

import('./slash-commands/index.js')
  .then(module => {
    console.log('Module loaded successfully');
    return module.handleSlashCommand('/mcp-helper help');
  })
  .then(result => {
    console.log('Result:', JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  });