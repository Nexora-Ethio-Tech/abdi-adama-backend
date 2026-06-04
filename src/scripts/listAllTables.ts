import pool from '../config/database';

async function main() {
  const r = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log('Tables in database:', r.rows.map((row: any) => row.table_name));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
