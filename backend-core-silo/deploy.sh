#!/bin/bash

# Abdi Adama School Management System - Deployment Script
# This script automates the deployment process on cPanel

echo "=========================================="
echo "Abdi Adama School Management System"
echo "Automated Deployment Script"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Navigate to the repository directory
echo -e "${YELLOW}Step 1: Navigating to repository...${NC}"
cd /home/abdiadam/repositories/Abdi-Adama || {
    echo -e "${RED}Error: Could not find repository directory${NC}"
    exit 1
}
echo -e "${GREEN}✓ In repository directory${NC}"
echo ""

# Step 2: Pull latest changes from GitHub
echo -e "${YELLOW}Step 2: Pulling latest code from GitHub...${NC}"
git pull origin main || {
    echo -e "${RED}Error: Git pull failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Code updated successfully${NC}"
echo ""

# Step 3: Setup Node.js environment
echo -e "${YELLOW}Step 3: Setting up Node.js environment...${NC}"
# Source the Node.js environment from cPanel Setup Node.js App
if [ -f /home/abdiadam/nodevenv/public_html/frontend/16/bin/activate ]; then
    source /home/abdiadam/nodevenv/public_html/frontend/16/bin/activate
    echo -e "${GREEN}✓ Node.js environment activated${NC}"
elif [ -f /home/abdiadam/.nvm/nvm.sh ]; then
    source /home/abdiadam/.nvm/nvm.sh
    echo -e "${GREEN}✓ NVM environment activated${NC}"
else
    # Try to find npm in common locations
    export PATH="/opt/cpanel/ea-nodejs20/bin:$PATH"
    echo -e "${YELLOW}⚠ Using system Node.js${NC}"
fi
echo ""

# Step 4: Navigate to frontend directory
echo -e "${YELLOW}Step 4: Navigating to frontend directory...${NC}"
cd frontend || {
    echo -e "${RED}Error: Could not find frontend directory${NC}"
    exit 1
}
echo -e "${GREEN}✓ In frontend directory${NC}"
echo ""

# Step 5: Install dependencies
echo -e "${YELLOW}Step 5: Installing/updating dependencies...${NC}"
npm install || {
    echo -e "${RED}Error: npm install failed${NC}"
    echo -e "${YELLOW}Tip: Make sure Node.js is set up in cPanel > Setup Node.js App${NC}"
    exit 1
}
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 6: Build the frontend
echo -e "${YELLOW}Step 6: Building frontend for production...${NC}"
npm run build || {
    echo -e "${RED}Error: Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# Step 7: Copy built files to public_html
echo -e "${YELLOW}Step 7: Deploying to public_html...${NC}"
rm -rf /home/abdiadam/public_html/frontend/dist/*
cp -r dist/* /home/abdiadam/public_html/frontend/dist/ || {
    echo -e "${RED}Error: Failed to copy files${NC}"
    exit 1
}
echo -e "${GREEN}✓ Files deployed to public_html${NC}"
echo ""

# Step 8: Backend dist sync (if needed)
echo -e "${YELLOW}Step 8: Syncing backend compiled files...${NC}"
cd /home/abdiadam/repositories/Abdi-Adama/backend
if [ -d "dist" ]; then
    cp -r dist/* /home/abdiadam/public_html/backend/dist/
    echo -e "${GREEN}✓ Backend dist synced${NC}"
else
    echo -e "${YELLOW}⚠ No backend dist folder found (may need to run npm run build:prod in backend)${NC}"
fi
echo ""

# Completion message
echo "=========================================="
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart Node.js app in cPanel (Setup Node.js App)"
echo "2. Test the website at https://abdi-adama.com"
echo "3. Test provisionUser API endpoint"
echo ""
echo "Build artifacts location:"
echo "  Frontend: /home/abdiadam/public_html/frontend/dist/"
echo "  Backend: /home/abdiadam/public_html/backend/dist/"
echo ""
