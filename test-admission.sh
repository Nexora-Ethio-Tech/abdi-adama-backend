#!/bin/bash

echo "Testing admission workflow with curl..."
echo ""

# Test 1: Health check
echo "1. Health check..."
curl -s http://localhost:5000/health | jq .

echo ""
echo "2. Get all school-admin branches..."
curl -s http://localhost:5000/api/school-admin/branches | jq '.data | length' 2>/dev/null || echo "Failed - endpoint not found"

echo ""
echo "3. Get pending applications (no auth - should fail with 401)..."
curl -s http://localhost:5000/api/school-admin/applications | jq . 2>/dev/null || echo "Failed"

echo ""
echo "4. Test public application endpoint (the one that's needed)..."
curl -s -X POST http://localhost:5000/api/school-admin/public/applications \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","digital_id":"T123","dob":"2015-01-01","gender":"M","parentName":"Parent","parentPhone":"+251912345678","grade":"5"}' \
  | jq .

echo ""
echo "Test complete"
