#!/usr/bin/env bash

# Color codes for formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}    Telegram Searcher - Installation Script   ${NC}"
echo -e "${BLUE}==============================================${NC}"

# Check for Python
if ! command -v python &> /dev/null; then
    echo -e "${RED}Error: Python is not installed. Please install Python 3.10+ and try again.${NC}"
    exit 1
fi

python_version=$(python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo -e "${GREEN}✔ Found Python ${python_version}${NC}"

# Install Telethon
echo -e "${BLUE}Installing required library: telethon...${NC}"
if python -m pip install telethon; then
    echo -e "${GREEN}✔ telethon installed successfully.${NC}"
else
    echo -e "${RED}Error: Failed to install telethon. Please check your internet connection and try again.${NC}"
    exit 1
fi

# Create directory structure if not exist
mkdir -p static sessions

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}  Installation Complete! Ready to run.       ${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "To start the search engine:"
echo -e "  ${BLUE}python main.py${NC}"
echo -e ""
echo -e "Then open your browser and navigate to:"
echo -e "  ${BLUE}http://127.0.0.1:8000${NC}"
echo -e "=============================================="
