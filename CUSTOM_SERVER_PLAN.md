# Custom Server Support Implementation Plan

Generated: 2025-01-10  
**Status: 90% Complete** ✅

## 🎉 Implementation Status

### ✅ Completed Features
- **Minimum Server Requirements**: Updated to include serena, sequentialthinking, context7 as required
- **MinimumServersValidator**: Full validation system for foundation servers
- **Add-Custom Command**: Complete wizard flow with multiple source types (GitHub, NPM, Docker, manual)
- **Auto-Analysis**: GitHub repository and NPM package analyzers with serena integration
- **Custom Server Storage**: Persists to ~/.mcp-helper/custom-servers/
- **ServerCardsManager**: Extended to load and merge custom server cards
- **CLAUDE.md Generator**: Includes custom servers in documentation
- **List Command**: Shows custom server indicators

### ⏳ Remaining Tasks
- End-to-end testing with real custom servers
- Documentation and user guide
- Error recovery and edge case handling

## Overview
Implement comprehensive custom MCP server support in mcp-helper, allowing users to add their own MCP servers beyond the pre-defined catalog.

## Core Concept
Users need specific MCP servers configured BEFORE they can effectively analyze and integrate custom servers. These "foundation servers" provide the capabilities needed to understand, research, and configure new custom servers.

## Phase 1: Update Minimum Server Requirements

### Updated Minimum Server Set
```json
{
  "required": [
    {
      "id": "serena",
      "rationale": "Semantic code analysis to understand custom server implementation"
    },
    {
      "id": "sequentialthinking", 
      "rationale": "Complex planning for custom server integration strategy"
    },
    {
      "id": "context7",
      "rationale": "Real-time documentation lookup for frameworks used by custom servers"
    }
  ],
  "strongly_recommended": [
    {
      "id": "memory",
      "rationale": "Persist custom server configurations and learnings"
    },
    {
      "id": "perplexity-ask",
      "rationale": "Research custom server documentation and best practices"
    },
    {
      "id": "github-official",
      "rationale": "Access custom server repositories and examples"
    }
  ]
}
```

### Why These Servers?
1. **serena** - Analyzes custom server code structure, finds entry points, understands API
2. **sequentialthinking** - Plans integration approach, breaks down complex custom configs
3. **context7** - Gets latest docs for technologies the custom server uses
4. **memory** - Remembers custom server patterns for future use
5. **perplexity-ask** - Researches how others integrated similar servers
6. **github-official** - Explores custom server repo, issues, examples

## Phase 2: Validation System

### 1. Implement validateMinimumServers()
```javascript
// lib/minimum-servers-validator.js
class MinimumServersValidator {
  async validate(configManager) {
    const configured = await configManager.listServers();
    const minimum = await this.loadMinimumServers();
    
    const missing = minimum.required.filter(req => 
      !configured.some(srv => srv.id === req.id)
    );
    
    return {
      isValid: missing.length === 0,
      missing,
      warnings: this.checkRecommended(configured, minimum)
    };
  }
  
  async enforceBeforeCustom() {
    const validation = await this.validate();
    if (!validation.isValid) {
      throw new Error(`Cannot add custom servers. Missing required: ${validation.missing.join(', ')}`);
    }
  }
}
```

### 2. Integration Points
- Check in `/mcp-helper add-custom` command
- Warn in `/mcp-helper init` if minimum not met
- Show status in `/mcp-helper list`

## Phase 3: Custom Server Command

### /mcp-helper add-custom Command Flow

```
1. Validate minimum servers are configured
2. Gather basic information (interactive prompts)
3. Auto-analyze if GitHub URL provided
4. Generate server card
5. Validate configuration
6. Save to custom catalog
7. Update CLAUDE.md
```

### Implementation Structure
```javascript
// slash-commands/mcp-helper-add-custom.js
async function addCustom() {
  // Step 1: Validate prerequisites
  const validator = new MinimumServersValidator();
  await validator.enforceBeforeCustom();
  
  // Step 2: Gather information
  const answers = await inquirer.prompt([
    {
      name: 'source',
      type: 'list',
      message: 'How would you like to add the custom server?',
      choices: [
        'From GitHub repository (auto-analyze)',
        'From NPM package',
        'From Docker image',
        'Manual configuration'
      ]
    }
  ]);
  
  // Step 3: Route to appropriate wizard
  switch(answers.source) {
    case 'From GitHub repository':
      return await addFromGitHub();
    case 'From NPM package':
      return await addFromNPM();
    // etc...
  }
}
```

## Phase 4: Auto-Analysis Features

### GitHub Repository Analysis
```javascript
async function addFromGitHub() {
  const { repoUrl } = await inquirer.prompt([
    {
      name: 'repoUrl',
      message: 'GitHub repository URL:',
      validate: validateGitHubUrl
    }
  ]);
  
  console.log('🔍 Analyzing repository with serena and github-official...');
  
  // Use github-official to get repo structure
  const repoInfo = await analyzeWithGitHub(repoUrl);
  
  // Use serena to analyze code patterns
  const codeAnalysis = await analyzeWithSerena(repoInfo);
  
  // Use context7 for framework docs
  const frameworkInfo = await getFrameworkDocs(codeAnalysis.dependencies);
  
  // Use sequentialthinking to plan configuration
  const configPlan = await planConfiguration(codeAnalysis, frameworkInfo);
  
  // Present findings to user
  return await confirmConfiguration(configPlan);
}
```

### Analysis Outputs
1. **Detected runtime**: NPX, Docker, Python, etc.
2. **Required environment variables**: From code analysis
3. **Configuration template**: Based on similar servers
4. **Dependencies**: What the server needs to run
5. **Suggested ratings**: Based on complexity and features

## Phase 5: Custom Server Card Schema

### Extended Server Card for Custom Servers
```json
{
  "id": "custom-my-server",
  "name": "My Custom Server",
  "isCustom": true,
  "source": {
    "type": "github",
    "url": "https://github.com/user/my-mcp-server"
  },
  "autoDetected": {
    "runtime": "docker",
    "envVars": ["API_KEY", "BASE_URL"],
    "confidence": 0.85
  },
  "userOverrides": {
    "name": "User's preferred name",
    "description": "User's description"
  },
  "agenticUsefulness": {
    "humanVerificationRating": 3,
    "aiAgentRating": 4,
    "ratingRationale": {
      "human": "Auto-generated: Custom server for specific use case",
      "agent": "Auto-generated: Provides programmatic access to service"
    }
  },
  "validated": false,
  "lastAnalyzed": "2025-01-10T10:00:00Z"
}
```

## Phase 6: Storage System

### Custom Server Storage
```
~/.mcp-helper/
├── custom-servers/
│   ├── catalog.json         # Index of all custom servers
│   ├── my-server.json       # Individual custom server cards
│   └── another-server.json
├── analysis-cache/          # Cache analysis results
│   └── github-com-user-repo.json
└── backups/                 # Existing backup system
```

### ServerCardsManager Enhancement
```javascript
class ServerCardsManager {
  async initialize() {
    // Load built-in cards
    await this.loadBuiltInCards();
    
    // NEW: Load custom cards
    await this.loadCustomCards();
    
    // Merge catalogs
    this.mergeCards();
  }
  
  async loadCustomCards() {
    const customDir = path.join(os.homedir(), '.mcp-helper', 'custom-servers');
    if (await fs.pathExists(customDir)) {
      const files = await fs.readdir(customDir);
      for (const file of files.filter(f => f.endsWith('.json'))) {
        const card = await fs.readJson(path.join(customDir, file));
        this.customCards.set(card.id, card);
      }
    }
  }
}
```

## Phase 7: Validation & Testing

### Custom Server Validation
```javascript
async function validateCustomServer(card) {
  const tests = [
    {
      name: 'Configuration Template',
      test: () => card.configTemplate && card.configTemplate.command
    },
    {
      name: 'Environment Variables',
      test: () => card.envSchema && Array.isArray(card.envSchema)
    },
    {
      name: 'Runtime Compatibility',
      test: () => ['docker', 'npx', 'python', 'node'].includes(card.runtime)
    }
  ];
  
  const results = tests.map(t => ({
    name: t.name,
    passed: t.test()
  }));
  
  return {
    isValid: results.every(r => r.passed),
    results
  };
}
```

## Phase 8: User Experience

### Interactive Wizard Flow
```
$ /mcp-helper add-custom

🚀 MCP Helper - Add Custom Server

? How would you like to add the custom server? › From GitHub repository

? GitHub repository URL: › https://github.com/example/my-mcp-server

🔍 Analyzing repository...
  ✓ Repository structure analyzed
  ✓ Code patterns detected
  ✓ Dependencies identified
  ✓ Configuration template generated

📋 Detected Configuration:
  Name: my-mcp-server
  Runtime: Docker
  Required env vars: API_KEY, BASE_URL
  
? Is this correct? › Yes

? Rate this server for human verification (1-5): › 3
? Rate this server for AI agent use (1-5): › 4

? Any additional environment variables? › No

✅ Custom server added successfully!

Next steps:
1. Configure environment variables in .env
2. Restart Claude Code
3. Test with: /mcp list
```

## Implementation Timeline

### Day 1: Foundation
- [x] Update minimum_servers.json ✅
- [x] Create MinimumServersValidator class ✅
- [x] Integrate validation into existing commands ✅

### Day 2: Core Command
- [x] Create /mcp-helper add-custom command ✅
- [x] Implement basic wizard flow ✅
- [x] Set up custom server storage ✅

### Day 3: Auto-Analysis
- [x] GitHub repository analyzer ✅
- [x] NPM package analyzer ✅
- [x] Code pattern detection with serena ✅

### Day 4: Integration
- [x] Merge custom cards in ServerCardsManager ✅
- [x] Update CLAUDE.md generator ✅
- [x] Add custom server indicators to /mcp-helper list ✅

### Day 5: Testing & Polish
- [ ] End-to-end testing
- [ ] Error handling
- [ ] Documentation

## Success Criteria

1. **Minimum servers enforced** before custom additions
2. **Auto-analysis** correctly detects 80%+ of configuration
3. **Custom servers** appear in /mcp-helper list
4. **CLAUDE.md** includes custom server documentation
5. **Storage** persists across sessions
6. **Validation** prevents invalid configurations

## Risk Mitigation

1. **Invalid custom configs**: Validation at every step
2. **Analysis failures**: Fallback to manual configuration
3. **Storage corruption**: Backup system already in place
4. **Version conflicts**: Custom servers namespaced with "custom-"
5. **Security concerns**: Warn about untrusted sources

## Notes

- Custom servers always prefixed with "custom-" to avoid conflicts
- Analysis results cached to avoid repeated API calls
- User can always override auto-detected configuration
- Custom cards can be shared via export/import feature (future)