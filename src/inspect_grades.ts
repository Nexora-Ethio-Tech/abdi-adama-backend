import pool from './config/db';

async function main() {
  try {
    const gradesCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'grades'
    `);
    console.log('--- GRADES COLUMNS ---');
    console.log(gradesCols.rows.map(r => `${r.column_name}: ${r.data_type}`));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

main();
