const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'seed_original_mock_users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Reading seed SQL from:', sqlPath);
    console.log('Executing seed...');
    await pool.query(sql);
    console.log('✓ Database seeded successfully!');
  } catch (err) {
    console.error('✘ Error running seed script:', err);
  } finally {
    await pool.end();
  }
}

run();
