# MCP-Helper Implementation Plan

Generated: 2025-08-10

## Overview
This plan outlines the completion of mcp-helper as a deployable NPM package with full server card coverage for all 17-18 standard MCP servers.

## Current Status (Updated 2025-01-10 - CLI/Slash Command Restructuring)

### ✅ COMPLETED
- **CLI Commands**: All 5 implemented as standalone CLI (init, add, list, reconfigure, add-custom)
- **Custom Server Support**: 90% complete - `/mcp-helper add-custom` command functional
- **CLI Restructuring**: Refactored from slash-commands to proper CLI architecture
  - BaseCommand class with shared functionality
  - CommandRouter for unified dispatching
  - E2E test suite with 8 tests
- **Server Cards**: 13 of 18 complete (72%)
  - Original 8: perplexity-ask, brave-search, context7, serena, github-official, firecrawl, memory, sequentialthinking
  - New (5 of 10): postgres, slack, openmemory, atlassian, notion
- **NPM Package Structure**: Ready but not published

### 🏗️ ARCHITECTURE CLARIFICATION
- **CLI Tool** (✅ Implemented): Standalone command-line tool in `cli/` directory
- **Slash Commands** (🚧 Planned): Future Claude Code integration in `slash-commands/` directory
- **Decision**: Maintaining both approaches per user request ("both for now")

### 📋 TODO Next Session
1. **Research Claude Code Extension API**: Understand how to create true slash commands
2. **Implement slash-commands**: Create Claude Code native integration
3. **Complete remaining server cards**: puppeteer, playwright, docker-mcp, claude-code, linkedin-mcp-server
4. **Test custom server flow**: Validate minimum_servers.json with real custom servers
5. **Publish NPM package**: After slash command integration

## Phase 1: Minimum Server Set Definition (NEEDS UPDATE)

### 🚨 UPDATE REQUIRED - Todo #17
Minimum servers must include:
- **serena** - Code analysis
- **sequentialthinking** - Planning
- **context7** - Documentation

### Objective
Define the minimum set of servers required for custom server support.

### Essential Servers
1. **serena** - Semantic code understanding for analyzing custom servers
2. **memory/openmemory** - Persist custom server configurations  
3. **perplexity-ask** - Research custom server documentation
4. **sequentialthinking** - Plan custom server integration
5. **github-official** - Access custom server repositories

### Implementation
- Create `catalog/minimum_servers.json`
- Add validation in mcp-helper init command
- Update documentation

## Phase 2: NPM Package Structure (✅ STRUCTURE COMPLETE, NOT PUBLISHED)

### Status
- Package name: @mcp/helper
- postinstall.js created with auto-setup
- bin/mcp-helper CLI wrapper implemented
- Ready for npm publish

### Package Structure
```
@mcp/helper/
├── package.json          # NPM metadata
├── postinstall.js        # Auto-setup script
├── bin/
│   └── mcp-helper       # CLI wrapper
├── slash-commands/       # Existing commands
├── lib/                  # Core libraries
├── catalog/
│   ├── server_cards/    # All server cards
│   └── minimum_servers.json
└── templates/           # CLAUDE.md template
```

### Key Features
- Global installation: `npm install -g @mcp/helper`
- Automatic Claude Code integration
- CLAUDE.md generation on install
- Memory protocol established for consistent status tracking
- PROJECT_STATUS_CURRENT entity for single source of truth
- Slash command registration

### Postinstall Actions
1. Detect Claude Code installation
2. Register `/mcp-helper` slash commands
3. Generate initial CLAUDE.md
4. Display quick start guide

## Phase 3: Tier 1 Server Cards (Day 2)

### High Priority Servers

#### postgres.json
- **Human**: 4/5 (Database inspection, query verification)
- **Agent**: 3/5 (Data operations, schema management)
- **Runtime**: Docker
- **Key Env**: POSTGRES_CONNECTION_STRING

#### slack.json  
- **Human**: 5/5 (Team notifications, collaboration)
- **Agent**: 2/5 (Automated notifications)
- **Runtime**: NPX
- **Key Env**: SLACK_BOT_TOKEN, SLACK_TEAM_ID

#### openmemory.json
- **Human**: 3/5 (Context review)
- **Agent**: 5/5 (Persistent memory alternative)
- **Runtime**: Docker
- **Key Env**: OPENAI_API_KEY

## Phase 4: Tier 2 Server Cards (Day 3)

### Important Integrations

#### atlassian.json
- **Human**: 4/5 (Project management)
- **Agent**: 3/5 (Issue automation)
- **Runtime**: Docker
- **Key Env**: JIRA_*, CONFLUENCE_*

#### notion.json
- **Human**: 4/5 (Documentation management)
- **Agent**: 3/5 (Content automation)
- **Runtime**: Docker
- **Key Env**: INTERNAL_INTEGRATION_TOKEN

#### puppeteer.json
- **Human**: 3/5 (Web testing)
- **Agent**: 4/5 (Browser automation)
- **Runtime**: NPX
- **Key Env**: None required

## Phase 5: Tier 3 Server Cards (Day 4)

### Specialized Servers

#### playwright.json
- Alternative to puppeteer
- Better cross-browser support
- **Runtime**: NPX

#### linkedin-mcp-server.json
- Professional networking
- **Runtime**: Docker
- **Key Env**: LINKEDIN_COOKIE

#### docker-mcp-toolkit.json
- Container management
- Memory service gateway
- **Runtime**: Docker

#### claude-code.json
- Meta server for Claude Code
- **Runtime**: NPX

## Implementation Tasks

### Immediate Actions
1. ✅ Save this plan to IMPLEMENTATION_PLAN.md
2. Create minimum_servers.json configuration
3. Research each server's actual requirements

### Research Needed
- Exact environment variables for each server
- Docker image names and tags
- NPX package names and versions
- Server-specific configuration options
- Integration patterns and best practices

### Testing Requirements
- Test each server card configuration
- Verify environment variable validation
- Test NPM package installation flow
- Validate postinstall script behavior

## Success Criteria
- All 18 servers have complete server cards
- NPM package installs cleanly with `npm install -g @mcp/helper`
- Postinstall script successfully:
  - Registers slash commands
  - Creates initial CLAUDE.md
  - Shows configuration instructions
- Minimum server set validation works
- All existing functionality preserved

## Risk Mitigation
- Research each server thoroughly before creating cards
- Test incrementally after each server card
- Maintain backward compatibility
- Create comprehensive error handling
- Document all assumptions

## Notes
- Use perplexity-ask and github-official to research server details
- Leverage serena for code analysis of existing implementations
- Save progress to memory at each milestone
- Follow agenticUsefulness rating patterns from existing cards