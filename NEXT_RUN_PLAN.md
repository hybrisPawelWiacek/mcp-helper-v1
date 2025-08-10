# Next Run Plan: Puppeteer & Playwright Server Cards

## Memory Protocol Established
- PRIMARY STATUS: Use `PROJECT_STATUS_CURRENT` entity for latest status
- Query pattern: `search_nodes('PROJECT_STATUS_CURRENT')` for status checks
- Detail entities: Named with specific context for implementation details

## Current Status
- **Date**: 2025-01-10
- **Progress**: 5 of 10 server cards complete (50%)
- **Completed**: postgres, slack, openmemory, atlassian, notion
- **Next**: puppeteer, playwright (both browser automation tools)

## Plan for Next 2 Servers

### 1. Puppeteer Server Card
**Research Needed**:
- NPM package: @modelcontextprotocol/server-puppeteer
- Environment variables required
- Browser automation capabilities
- Headless vs headed mode configuration
- Common use cases (web scraping, testing, PDF generation)

**Key Considerations**:
- Chrome/Chromium dependency management
- Performance implications of browser automation
- Security considerations for automated browsing
- Rate limiting and anti-bot detection

**Agentic Usefulness Estimate**:
- Human: 3/5 (useful for testing and verification)
- Agent: 4/5 (powerful for web automation tasks)

### 2. Playwright Server Card
**Research Needed**:
- NPM package: @modelcontextprotocol/server-playwright
- Multi-browser support (Chrome, Firefox, Safari)
- Comparison with Puppeteer capabilities
- Environment configuration differences
- Advanced features (network interception, mobile emulation)

**Key Considerations**:
- Multiple browser engine support
- Better cross-browser testing capabilities
- More robust API than Puppeteer
- Larger resource footprint

**Agentic Usefulness Estimate**:
- Human: 3/5 (testing and cross-browser verification)
- Agent: 5/5 (superior automation with multi-browser support)

## Implementation Steps

1. **Research Phase** (10 minutes):
   - Use perplexity-ask for MCP-specific details
   - Check install-mcp-servers-global.sh for actual configs
   - Review GitHub repos for documentation

2. **Creation Phase** (15 minutes):
   - Create puppeteer.json with full metadata
   - Create playwright.json with full metadata
   - Ensure toolSelectionProtocol differentiates them
   - Add integration synergies with other servers

3. **Validation Phase** (5 minutes):
   - Verify JSON structure against schema
   - Check all required fields populated
   - Update PROJECT_STATUS_CURRENT in memory
   - Update TodoWrite progress

## Expected Outcomes
- 2 more server cards complete (7 of 10 total)
- 70% overall progress
- Clear differentiation between Puppeteer and Playwright use cases
- Integration patterns with other servers documented

## Tools to Use
- `perplexity-ask`: Research MCP server details
- `grep/serena`: Find existing configurations
- `Write`: Create server card JSON files
- `memory`: Update PROJECT_STATUS_CURRENT
- `TodoWrite`: Track task completion

## Success Criteria
- Both server cards have complete agenticUsefulness ratings
- Clear use case differentiation between the two
- Integration synergies documented
- toolSelectionProtocol shows when to use each