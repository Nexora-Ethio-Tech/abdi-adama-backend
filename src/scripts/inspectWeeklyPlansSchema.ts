import pool from '../config/db';

async function main() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'teachers' 
      ORDER BY ordinal_position;
    `);
    console.log('=== teachers columns ===');
    res.rows.forEach((r: any) => console.log(`  ${r.column_name}: ${r.data_type}`));
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
