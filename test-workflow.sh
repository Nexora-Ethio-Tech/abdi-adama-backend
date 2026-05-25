#!/bin/bash

# Test Workflow Script for Admission → Finance Clerk Flow

echo "========== ADMISSION WORKFLOW TEST =========="
echo ""

# Set variables
API_URL="http://localhost:5000"
ADMIN_TOKEN="${ADMIN_TOKEN:-your-admin-token}"
CLERK_TOKEN="${CLERK_TOKEN:-your-clerk-token}"

# Helper function to make API calls
api_call() {
  local method=$1
  local endpoint=$2
  local token=$3
  local data=$4
  
  if [ -z "$data" ]; then
    curl -s -X $method "$API_URL$endpoint" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json"
  else
    curl -s -X $method "$API_URL$endpoint" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

# Step 1: Check if applications exist in database
echo "Step 1: Checking recent applications in database..."
api_call "GET" "/api/school-admin/applications" "$ADMIN_TOKEN" | jq '.data[] | {id, applicant_name, status}'
echo ""

# Step 2: Manually update one application to 'awaiting-payment' status
echo "Step 2: Simulating School Admin passing application to Finance..."
FIRST_APP_ID=$(api_call "GET" "/api/school-admin/applications?status=pending" "$ADMIN_TOKEN" | jq -r '.data[0].id' 2>/dev/null)

if [ ! -z "$FIRST_APP_ID" ] && [ "$FIRST_APP_ID" != "null" ]; then
  echo "Updating app $FIRST_APP_ID to awaiting-payment..."
  api_call "PATCH" "/api/school-admin/applications/$FIRST_APP_ID/status" "$ADMIN_TOKEN" '{"status":"awaiting-payment"}' | jq '.'
else
  echo "No pending applications found. Creating test data first..."
fi
echo ""

# Step 3: Check what Finance Clerk can see
echo "Step 3: Checking Finance Clerk Applications (awaiting-payment)..."
api_call "GET" "/api/finance-clerk/applications?status=awaiting-payment" "$CLERK_TOKEN" | jq '.data | length' 
echo "Total applications awaiting payment:"
api_call "GET" "/api/finance-clerk/applications?status=awaiting-payment" "$CLERK_TOKEN" | jq '.data[] | {id, applicant_name, status}'
echo ""

# Step 4: Check without status filter
echo "Step 4: Checking Finance Clerk Applications (no filter)..."
api_call "GET" "/api/finance-clerk/applications" "$CLERK_TOKEN" | jq '.data[] | {id, applicant_name, status}'
echo ""

# Step 5: Test payment approval
echo "Step 5: Testing payment approval..."
if [ ! -z "$FIRST_APP_ID" ] && [ "$FIRST_APP_ID" != "null" ]; then
  echo "Approving payment for $FIRST_APP_ID..."
  api_call "PATCH" "/api/finance-clerk/applications/$FIRST_APP_ID/approve" "$CLERK_TOKEN" '{"amount": 5000, "reference": "TEST-001"}' | jq '.'
fi
echo ""

echo "========== TEST COMPLETE =========="
