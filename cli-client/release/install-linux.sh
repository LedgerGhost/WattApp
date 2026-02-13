#!/bin/bash
# install-linux.sh
# Simple one-click installer for Linux

set -e

APP_NAME="WattappCLI"
CLI_NAME="se2537"
BINARY_NAME="se2537-linux"
INSTALL_DIR="$HOME/.local/bin"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=================================${NC}"
echo -e "${CYAN}  $APP_NAME Installer${NC}"
echo -e "${CYAN}=================================${NC}"
echo ""

# Ask for permission
echo -e "${YELLOW}This will install $APP_NAME to:${NC}"
echo -e "  $INSTALL_DIR"
echo ""
echo -e "${YELLOW}and add it to your PATH so you can use it anywhere.${NC}"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Installation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}Installing...${NC}"

# Check if binary exists
if [ ! -f "$BINARY_NAME" ]; then
    echo ""
    echo -e "${RED}Error: $BINARY_NAME not found${NC}"
    echo -e "${YELLOW}Please run this script from the same folder as the binary${NC}"
    exit 1
fi

# Create directory
mkdir -p "$INSTALL_DIR"

# Copy binary
cp "$BINARY_NAME" "$INSTALL_DIR/$CLI_NAME"
chmod +x "$INSTALL_DIR/$CLI_NAME"

# Add to PATH if needed
SHELL_CONFIG=""
if [[ $SHELL == *"bash"* ]]; then
    SHELL_CONFIG="$HOME/.bashrc"
elif [[ $SHELL == *"zsh"* ]]; then
    SHELL_CONFIG="$HOME/.zshrc"
fi

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]] && [ -n "$SHELL_CONFIG" ]; then
    echo "" >> "$SHELL_CONFIG"
    echo "# Added by $APP_NAME installer" >> "$SHELL_CONFIG"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_CONFIG"
fi

# Success message
echo ""
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}  Installation Successful!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${NC}You can now use $APP_NAME from anywhere!${NC}"
echo ""
echo -e "${CYAN}Try it now:${NC}"
echo -e "  ${YELLOW}$CLI_NAME healthcheck${NC}"
echo ""
echo -e "${GRAY}Note: You may need to restart your terminal${NC}"
echo -e "${GRAY}      or run: source $SHELL_CONFIG${NC}"
echo ""