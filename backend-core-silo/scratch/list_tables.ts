import pool from './config/db';

async function listTables() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'silo_%'");
    console.log('Existing silo tables:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
listTables();
