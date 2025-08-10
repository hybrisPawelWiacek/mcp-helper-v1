# MCP-Helper 🚀

> Intelligent MCP (Model Context Protocol) server management for Claude Code CLI

MCP-Helper is a slash command extension for Claude Code that simplifies the discovery, configuration, and management of MCP servers. It provides personalized recommendations, interactive onboarding, and seamless integration with your development workflow.

## ✨ Features

- **🎯 Smart Recommendations** - Analyzes your project to suggest the most relevant MCP servers
- **🎨 Personalized Experience** - Adapts communication style to your expertise level and preferences
- **🔄 Legacy Support** - Seamlessly integrates with existing MCP configurations
- **🧙 Interactive Onboarding** - Guided setup wizard for new users
- **📊 Agentic Ratings** - Human and AI agent usefulness ratings for each server
- **🔧 Custom Server Support** - Add any MCP server, even those not in our catalog

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/mcp-helper/mcp-helper.git
cd mcp-helper

# Install dependencies
npm install

# Run the onboarding wizard
npm run onboard
```

### First Time Setup (Interactive)

Start Claude Code and run:

```
/mcp-helper init --onboarding
```

This will:
1. Set up your communication preferences (expertise level, verbosity, tone)
2. Analyze your project's technology stack
3. Recommend essential MCP servers
4. Configure environment variables
5. Generate documentation

### Quick Setup (Non-Interactive)

For experienced users who want minimal setup:

```
/mcp-helper init --quick
```

## 📚 Available Commands

All commands are used within Claude Code as slash commands:

### Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/mcp-helper init` | Initialize MCP configuration | `/mcp-helper init --onboarding` |
| `/mcp-helper add <server>` | Add an MCP server | `/mcp-helper add github-official` |
| `/mcp-helper list` | List configured servers | `/mcp-helper list` |
| `/mcp-helper reconfigure <server>` | Modify server settings | `/mcp-helper reconfigure postgres` |
| `/mcp-helper add-custom` | Add a custom server | `/mcp-helper add-custom` |
| `/mcp-helper advisor` | Get recommendations | `/mcp-helper advisor --report` |

### Command Options

#### init
- `--onboarding` - Run interactive setup wizard
- `--quick` - Quick setup with defaults
- `--reconfigure` - Reconfigure preferences

#### advisor
- `--report` - Generate detailed report (saves to `mcp-advisory-report.md`)
- `--interactive` - Interactive advisory session

#### list
- `--detailed` - Show detailed server information
- `--ratings` - Show human and AI agent ratings

## 🎯 Recommended Server Stack

Based on extensive testing and user feedback, here's our recommended MCP server stack:

### Essential Servers (Install First)

1. **serena** (⭐⭐⭐⭐⭐) - Semantic code understanding
   - AI Agent Rating: 5/5 | Human Rating: 4/5
   - Perfect for code navigation and refactoring

2. **sequentialthinking** (⭐⭐⭐⭐⭐) - Complex task planning
   - AI Agent Rating: 5/5 | Human Rating: 4/5
   - Break down complex problems into manageable steps

3. **github-official** (⭐⭐⭐⭐⭐) - Complete GitHub integration
   - AI Agent Rating: 5/5 | Human Rating: 4/5
   - Essential for version control workflows

### Highly Recommended

4. **memory** (⭐⭐⭐⭐⭐) - Persistent context
   - AI Agent Rating: 5/5 | Human Rating: 3/5
   - Maintain context across sessions

5. **context7** (⭐⭐⭐⭐⭐) - Up-to-date documentation
   - AI Agent Rating: 5/5 | Human Rating: 3/5
   - Access latest framework docs

6. **perplexity-ask** (⭐⭐⭐⭐) - Deep research
   - AI Agent Rating: 4/5 | Human Rating: 3/5
   - Complex multi-source research

## 🧑‍💻 Usage Examples

### Example 1: Setting Up a New React Project

```bash
# Initialize with onboarding
/mcp-helper init --onboarding

# When prompted, select:
# - Project type: React
# - Expertise: balanced
# - Verbosity: concise

# MCP-Helper will recommend:
# - firecrawl (for web scraping)
# - context7 (for React docs)
# - playwright (for testing)
```

### Example 2: Adding GitHub Integration

```bash
# Add GitHub server
/mcp-helper add github-official

# Set up environment variable
export GITHUB_PAT="your_github_personal_access_token"

# Test the integration
claude "Using github-official, what is my username?"
```

### Example 3: Custom Server Configuration

```bash
# Add a custom server not in catalog
/mcp-helper add-custom

# Follow prompts to provide:
# - Server name
# - npm package or docker image
# - Environment variables
# - Transport type (stdio/http)
```

## 🎨 Personality Configuration

MCP-Helper adapts to your preferences:

### Expertise Levels
- **Expert** - Minimal explanations, technical details
- **Balanced** - Moderate explanations, best for most users
- **Student** - Detailed explanations, learning-focused

### Communication Styles
- **Verbosity**: minimal, concise, balanced, verbose
- **Tone**: casual, neutral, formal, friendly
- **Emojis**: Enable/disable emoji usage

### Reconfigure Anytime

```bash
/mcp-helper init --reconfigure
```

## 🔧 Environment Variables

MCP-Helper manages environment variables for all servers. Common ones include:

```bash
# Core Services
export GITHUB_PAT="ghp_..."              # GitHub
export PERPLEXITY_API_KEY="pplx-..."     # Perplexity
export BRAVE_API_KEY="BSA..."            # Brave Search
export FIRECRAWL_API_KEY="fc-..."        # Firecrawl

# Databases
export POSTGRES_CONNECTION_STRING="postgresql://..."

# Communication
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_TEAM_ID="T..."

# Documentation
export NOTION_API_TOKEN="secret_..."
export CONFLUENCE_URL="https://..."
```

## 📊 Server Ratings Explained

Each server has two ratings:

- **Human Verification Rating (1-5)**: How useful for human oversight
- **AI Agent Rating (1-5)**: How essential for autonomous AI tasks

Servers with 5/5 AI Agent ratings are essential for effective AI development.

## 🤝 Integration with Existing Projects

MCP-Helper intelligently handles existing configurations:

1. **Detects** existing `~/.claude.json` configurations
2. **Analyzes** current server setup for issues
3. **Offers** merge strategies:
   - Merge: Combine existing + recommended
   - Preserve: Keep existing, add environment setup
   - Replace: Backup and start fresh

## 🐛 Troubleshooting

### Common Issues

**Q: Command not recognized**
```bash
# Ensure you're in Claude Code, not terminal
# Commands start with /mcp-helper, not mcp-helper
```

**Q: Server not starting**
```bash
# Check environment variables
/mcp-helper advisor  # Will detect missing env vars

# Verify server is installed
npm list -g @mcp-servers/github
```

**Q: Personality settings not applying**
```bash
# Reset preferences
rm -rf ~/.mcp-helper/preferences.json
/mcp-helper init --onboarding
```

## 📈 Project Status

MCP-Helper is **90% complete** with all core features implemented:

- ✅ All 6 slash commands functional
- ✅ Custom server support
- ✅ Personality management
- ✅ Project analysis
- ✅ Advisory engine
- ✅ Legacy config support
- 🚧 Global npm package (pending)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Claude Code team for the amazing CLI
- MCP server authors for their excellent tools
- Our beta testers for invaluable feedback

---

**Need Help?** 
- Run `/mcp-helper help` in Claude Code
- Check our [docs](https://github.com/mcp-helper/mcp-helper/wiki)
- File an [issue](https://github.com/mcp-helper/mcp-helper/issues)

**Made with ❤️ for the Claude Code community**