import pool from '../config/database';

async function main() {
  for (const table of ['finance_summaries', 'finance_settings_audit']) {
    const r = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [table]
    );
    console.log(`\n${table} columns:`, r.rows);
  }
  await pool.end();
}

main().catch(console.error);
