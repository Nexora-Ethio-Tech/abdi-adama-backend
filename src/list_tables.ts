import pool from './config/db';

async function main() {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
        AND (table_name LIKE '%student%' OR table_name LIKE '%transcript%' OR table_name LIKE '%history%' OR table_name LIKE '%promotion%' OR table_name LIKE '%academic%')
    `);
    console.log('--- FILTERED TABLES ---');
    console.log(tables.rows.map(r => r.table_name).sort());
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

main();
