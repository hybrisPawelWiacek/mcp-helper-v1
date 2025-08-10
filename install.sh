#!/bin/bash

# MCP-Helper Global Installation Script
# This script installs mcp-helper globally and sets up the environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}=====================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Check for required tools
check_requirements() {
    print_header "Checking Requirements"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        echo "Please install Node.js (v18 or higher) from: https://nodejs.org"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required (found v$NODE_VERSION)"
        exit 1
    fi
    print_success "Node.js $(node -v) detected"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm $(npm -v) detected"
    
    # Check git (optional but recommended)
    if command -v git &> /dev/null; then
        print_success "git $(git --version | cut -d' ' -f3) detected"
    else
        print_warning "git not found - manual updates will be required"
    fi
    
    # Check Claude Code CLI
    if command -v claude &> /dev/null; then
        print_success "Claude Code CLI detected"
    else
        print_warning "Claude Code CLI not detected - install from: https://claude.ai/code"
    fi
    
    echo ""
}

# Install mcp-helper globally
install_mcp_helper() {
    print_header "Installing MCP-Helper"
    
    # Get the directory of this script
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    # Install dependencies
    print_info "Installing dependencies..."
    cd "$SCRIPT_DIR"
    npm install --production
    
    # Create global link
    print_info "Creating global link..."
    npm link
    
    print_success "MCP-Helper installed globally"
    echo ""
}

# Set up configuration directory
setup_config_dir() {
    print_header "Setting Up Configuration"
    
    CONFIG_DIR="$HOME/.mcp-helper"
    
    # Create config directory
    if [ ! -d "$CONFIG_DIR" ]; then
        mkdir -p "$CONFIG_DIR"
        print_success "Created configuration directory: $CONFIG_DIR"
    else
        print_info "Configuration directory already exists: $CONFIG_DIR"
    fi
    
    # Create templates directory
    TEMPLATES_DIR="$CONFIG_DIR/templates"
    if [ ! -d "$TEMPLATES_DIR" ]; then
        mkdir -p "$TEMPLATES_DIR"
        print_success "Created templates directory"
    fi
    
    # Copy personality templates
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    if [ -d "$SCRIPT_DIR/templates/personalities" ]; then
        cp -r "$SCRIPT_DIR/templates/personalities" "$TEMPLATES_DIR/"
        print_success "Installed personality templates"
    fi
    
    echo ""
}

# Check for existing MCP configuration
check_existing_config() {
    print_header "Checking Existing Configuration"
    
    CLAUDE_CONFIG="$HOME/.claude.json"
    
    if [ -f "$CLAUDE_CONFIG" ]; then
        print_warning "Existing Claude configuration detected at: $CLAUDE_CONFIG"
        echo ""
        echo "MCP-Helper can:"
        echo "  1) Merge with your existing configuration (recommended)"
        echo "  2) Back up and replace your configuration"
        echo "  3) Leave your configuration as-is"
        echo ""
        read -p "Choose an option [1-3]: " choice
        
        case $choice in
            1)
                print_info "Configuration will be merged during first run"
                ;;
            2)
                BACKUP_FILE="$CLAUDE_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
                cp "$CLAUDE_CONFIG" "$BACKUP_FILE"
                print_success "Backed up existing config to: $BACKUP_FILE"
                ;;
            3)
                print_info "Existing configuration will be preserved"
                ;;
            *)
                print_warning "Invalid choice - existing configuration will be preserved"
                ;;
        esac
    else
        print_info "No existing Claude configuration found"
    fi
    
    echo ""
}

# Set up command aliases (optional)
setup_aliases() {
    print_header "Setting Up Aliases (Optional)"
    
    echo "Would you like to set up shell aliases for quick access?"
    echo "This will add 'mcp' as an alias for 'mcp-helper'"
    read -p "Set up aliases? [y/N]: " setup_alias
    
    if [[ "$setup_alias" =~ ^[Yy]$ ]]; then
        # Detect shell
        SHELL_RC=""
        if [ -n "$ZSH_VERSION" ]; then
            SHELL_RC="$HOME/.zshrc"
        elif [ -n "$BASH_VERSION" ]; then
            if [ -f "$HOME/.bashrc" ]; then
                SHELL_RC="$HOME/.bashrc"
            elif [ -f "$HOME/.bash_profile" ]; then
                SHELL_RC="$HOME/.bash_profile"
            fi
        fi
        
        if [ -n "$SHELL_RC" ]; then
            # Check if alias already exists
            if ! grep -q "alias mcp=" "$SHELL_RC" 2>/dev/null; then
                echo "" >> "$SHELL_RC"
                echo "# MCP-Helper alias" >> "$SHELL_RC"
                echo "alias mcp='mcp-helper'" >> "$SHELL_RC"
                print_success "Added alias to $SHELL_RC"
                print_info "Run 'source $SHELL_RC' or restart your terminal to use the alias"
            else
                print_info "Alias already exists in $SHELL_RC"
            fi
        else
            print_warning "Could not detect shell configuration file"
            echo "Add this line to your shell configuration manually:"
            echo "  alias mcp='mcp-helper'"
        fi
    else
        print_info "Skipping alias setup"
    fi
    
    echo ""
}

# Run quick setup
run_quick_setup() {
    print_header "Quick Setup (Optional)"
    
    echo "Would you like to run the quick setup now?"
    echo "This will:"
    echo "  • Set default preferences (balanced expertise, neutral tone)"
    echo "  • Install essential MCP servers"
    echo "  • Create a basic .env file"
    echo ""
    echo "You can also run the interactive setup later with:"
    echo "  /mcp-helper init --onboarding"
    echo ""
    read -p "Run quick setup? [y/N]: " run_setup
    
    if [[ "$run_setup" =~ ^[Yy]$ ]]; then
        print_info "Running quick setup..."
        
        # Use Node.js to run the quick setup
        node -e "
        const { OnboardingWizard } = require('./lib/onboarding-wizard.js');
        const wizard = new OnboardingWizard();
        wizard.quickSetup().then(() => {
            console.log('Quick setup complete!');
        }).catch(err => {
            console.error('Quick setup failed:', err.message);
        });
        "
        
        print_success "Quick setup complete"
    else
        print_info "Skipping quick setup - run '/mcp-helper init --onboarding' in Claude Code to begin"
    fi
    
    echo ""
}

# Display next steps
show_next_steps() {
    print_header "Installation Complete! 🎉"
    
    echo "MCP-Helper has been installed successfully!"
    echo ""
    echo "${CYAN}Next Steps:${NC}"
    echo ""
    echo "1. Start Claude Code:"
    echo "   ${GREEN}claude${NC}"
    echo ""
    echo "2. Initialize your project (choose one):"
    echo "   ${GREEN}/mcp-helper init --onboarding${NC}  # Interactive setup (recommended)"
    echo "   ${GREEN}/mcp-helper init --quick${NC}       # Quick setup with defaults"
    echo "   ${GREEN}/mcp-helper init${NC}               # Basic initialization"
    echo ""
    echo "3. Get recommendations for your project:"
    echo "   ${GREEN}/mcp-helper advisor${NC}"
    echo ""
    echo "4. Add your first MCP server:"
    echo "   ${GREEN}/mcp-helper add github-official${NC}"
    echo ""
    echo "${CYAN}Useful Commands:${NC}"
    echo "  /mcp-helper list       - List configured servers"
    echo "  /mcp-helper add        - Add a server interactively"
    echo "  /mcp-helper add-custom - Add a custom server"
    echo "  /mcp-helper help       - Show all commands"
    echo ""
    echo "${CYAN}Documentation:${NC}"
    echo "  README: $SCRIPT_DIR/README.md"
    echo "  GitHub: https://github.com/mcp-helper/mcp-helper"
    echo ""
    
    if [ ! -f "$HOME/.claude.json" ]; then
        print_warning "Remember to set up your environment variables in .env files!"
    fi
}

# Main installation flow
main() {
    clear
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       MCP-Helper Installation         ║${NC}"
    echo -e "${CYAN}║   Intelligent MCP Server Management   ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    check_requirements
    install_mcp_helper
    setup_config_dir
    check_existing_config
    setup_aliases
    
    # Ask about quick setup
    echo "Installation is complete!"
    echo ""
    read -p "Would you like to run quick setup now? [y/N]: " do_setup
    if [[ "$do_setup" =~ ^[Yy]$ ]]; then
        run_quick_setup
    fi
    
    show_next_steps
}

# Handle interrupts
trap 'echo -e "\n${RED}Installation interrupted${NC}"; exit 1' INT TERM

# Run main installation
main

# Exit successfully
exit 0