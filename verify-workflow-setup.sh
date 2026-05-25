#!/bin/bash

# ============================================
# COMPLETE WORKFLOW FIX & SETUP GUIDE
# ============================================

echo "========== ADMISSION WORKFLOW - COMPLETE FIX =========="
echo ""
echo "This script will verify everything is set up correctly"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Database Migration
echo -e "${YELLOW}[1/5] Checking if database migration was applied...${NC}"
cd backend

node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'abdiadam_school_db',
  user: 'postgres',
  password: 'Haile'
});

(async () => {
  try {
    const res = await pool.query(\`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='pending_applications' AND column_name='student_id_generated'
    \`);
    
    if (res.rows.length > 0) {
      console.log('${GREEN}✅ Migration Applied${NC} - All workflow columns present');
    } else {
      console.log('${RED}❌ Migration NOT Applied${NC}');
      console.log('Run this command:');
      console.log('psql -U postgres -d abdiadam_school_db -f backend/database/admission_finalization_migration.sql');
    }
    await pool.end();
  } catch(e) {
    console.log('${RED}❌ Database error: ' + e.message + '${NC}');
    await pool.end();
  }
})();
"

echo ""

# Check 2: Applications exist
echo -e "${YELLOW}[2/5] Checking if applications with 'awaiting-payment' status exist...${NC}"

node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'abdiadam_school_db',
  user: 'postgres',
  password: 'Haile'
});

(async () => {
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM pending_applications WHERE status = \\'awaiting-payment\\'');
    const count = res.rows[0].count;
    
    if (count > 0) {
      console.log('${GREEN}✅ ' + count + ' Applications Ready for Finance Clerk${NC}');
    } else {
      console.log('${YELLOW}⚠️  No applications with awaiting-payment status${NC}');
      console.log('School Admin needs to pass applications first.');
    }
    await pool.end();
  } catch(e) {
    console.log('${RED}❌ Error: ' + e.message + '${NC}');
    await pool.end();
  }
})();
"

echo ""

# Check 3: Users exist
echo -e "${YELLOW}[3/5] Checking if Admin and Finance Clerk users exist...${NC}"

node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'abdiadam_school_db',
  user: 'postgres',
  password: 'Haile'
});

(async () => {
  try {
    const adminRes = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = \\'school-admin\\'');
    const clerkRes = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = \\'finance-clerk\\'');
    
    const adminCount = adminRes.rows[0].count;
    const clerkCount = clerkRes.rows[0].count;
    
    if (adminCount > 0) {
      console.log('${GREEN}✅ ' + adminCount + ' School Admin(s) found${NC}');
    } else {
      console.log('${RED}❌ No School Admin users found${NC}');
    }
    
    if (clerkCount > 0) {
      console.log('${GREEN}✅ ' + clerkCount + ' Finance Clerk(s) found${NC}');
    } else {
      console.log('${RED}❌ No Finance Clerk users found${NC}');
    }
    
    await pool.end();
  } catch(e) {
    console.log('${RED}❌ Error: ' + e.message + '${NC}');
    await pool.end();
  }
})();
"

echo ""
echo "========== SETUP INSTRUCTIONS =========="
echo ""
echo "To make the workflow work:"
echo ""
echo "1. START THE BACKEND SERVER:"
echo "   cd backend"
echo "   npm start"
echo ""
echo "2. IN ANOTHER TERMINAL, START THE FRONTEND:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. ACCESS THE APPLICATION:"
echo "   http://localhost:5173"
echo ""
echo "4. TEST THE WORKFLOW:"
echo "   a) Login as School Admin (${GREEN}65plante@gmail.com${NC})"
echo "   b) Go to Admin → Applications"
echo "   c) Click 'Pass to Finance' on an application"
echo "   d) Logout and login as Finance Clerk (${GREEN}werk5974@gmail.com${NC})"
echo "   e) Go to Finance → Registrations tab"
echo "   f) You should now see the applications ready for payment approval"
echo ""
echo "========================================="
