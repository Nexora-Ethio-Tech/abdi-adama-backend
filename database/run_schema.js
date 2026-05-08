const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Try multiple configurations
const configs = [
  { label: 'SSL rejectUnauthorized=false', ssl: { rejectUnauthorized: false } },
  { label: 'SSL=true', ssl: true },
  { label: 'No SSL', ssl: false },
];

async function tryConnect(config) {
  const client = new Client({
    host: '91.204.209.22',
    port: 5432,
    database: 'abdiadam_school_db',
    user: 'abdiadam',
    password: 'yMV+r23P9.rx7E',
    ssl: config.ssl,
    connectionTimeoutMillis: 20000,
  });

  console.log(`\nAttempt: ${config.label} ...`);
  try {
    await client.connect();
    console.log('Connected!\n');

    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('Executing schema ...');
    await client.query(sql);
    console.log('\n=== SCHEMA DEPLOYED SUCCESSFULLY ===\n');

    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name;
    `);
    console.log(`Tables created: ${res.rows.length}`);
    res.rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.table_name}`));
    await client.end();
    return true;
  } catch (err) {
    console.error(`Failed: ${err.message}`);
    try { await client.end(); } catch (_) {}
    return false;
  }
}

async function run() {
  for (const cfg of configs) {
    const ok = await tryConnect(cfg);
    if (ok) return;
  }
  console.log('\n=== ALL ATTEMPTS FAILED ===');
  console.log('The PostgreSQL port (5432) is likely firewalled on HahuCloud.');
  console.log('You can deploy the schema via cPanel > phpPgAdmin by importing schema.sql');
}

run();
