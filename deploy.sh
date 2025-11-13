#!/bin/bash

# FSM App - Safe Deployment Script (Linux/Mac)
# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "FSM App - Safe Deployment Script"
echo "========================================"
echo ""

# Step 1: Check if gcloud is installed
echo "[STEP 1/7] Checking Google Cloud SDK..."
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}ERROR: Google Cloud SDK not found!${NC}"
    echo "Please install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo -e "${GREEN}✓ Google Cloud SDK found${NC}"
echo ""

# Step 2: Get current project
echo "[STEP 2/7] Getting current Google Cloud project..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${YELLOW}No project currently set${NC}"
else
    echo -e "Current project: ${YELLOW}${CURRENT_PROJECT}${NC}"
fi
echo ""

# Step 3: List all projects
echo "[STEP 3/7] Listing your Google Cloud projects..."
echo ""
gcloud projects list
echo ""

# Step 4: Ask user to confirm or set project
echo "[STEP 4/7] Project Configuration"
read -p "Enter the FSM project ID to deploy to: " FSM_PROJECT
if [ -z "$FSM_PROJECT" ]; then
    echo -e "${RED}ERROR: Project ID cannot be empty${NC}"
    exit 1
fi
echo ""

# Step 5: Set the project
echo -e "[STEP 5/7] Setting project to: ${YELLOW}${FSM_PROJECT}${NC}"
gcloud config set project "$FSM_PROJECT"
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to set project${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Project set successfully${NC}"
echo ""

# Step 6: Verify project before deployment
echo "[STEP 6/7] Verifying project..."
VERIFY_PROJECT=$(gcloud config get-value project 2>/dev/null)
echo -e "Current active project: ${YELLOW}${VERIFY_PROJECT}${NC}"
echo ""
read -p "Deploy to this project? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled by user${NC}"
    exit 0
fi
echo ""

# Step 7: Deploy
echo "[STEP 7/7] Deploying to Google App Engine..."
echo -e "Project: ${YELLOW}${VERIFY_PROJECT}${NC}"
echo ""
gcloud app deploy --quiet
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Deployment failed${NC}"
    exit 1
fi
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Final project check
echo "Final verification..."
FINAL_PROJECT=$(gcloud config get-value project 2>/dev/null)
echo -e "Active project after deployment: ${YELLOW}${FINAL_PROJECT}${NC}"
echo ""

# Show deployed URL
echo "Getting deployment URL..."
APP_URL=$(gcloud app browse --no-launch-browser 2>&1 | grep -o 'http[s]*://[^[:space:]]*')
if [ -n "$APP_URL" ]; then
    echo ""
    echo -e "${GREEN}Your app is deployed at:${NC}"
    echo -e "${YELLOW}${APP_URL}${NC}"
    echo ""
    echo -e "Admin Dashboard: ${YELLOW}${APP_URL}/admin${NC}"
fi

echo ""
echo "Deployment complete!"
